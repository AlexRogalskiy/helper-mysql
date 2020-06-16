const Promise = require('the-promise');
const _ = require('the-lodash');
const HandledError = require('./handled-error');

class MySqlStatement
{
    constructor(driver, sql)
    {
        this._driver = driver;
        this._logger = driver.logger;
        this._sql = sql;
        this._statement = null;
        this._isPreparing = false;
        this._waiters = [];
    }

    get logger() {
        return this._logger;
    }

    get isDebug() {
        return this._driver._isDebug;
    }

    get isConnected() {
        return this._driver.isConnected;
    }

    get isPrepared() {
        return _.isNotNullOrUndefined(this._statement);
    }

    reset() {
        this._statement = null;
        this._isPreparing = false;
    }

    execute(params)
    {
        this.logger.silly("[_execute] executing: %s", this._sql);
        if (this.isDebug) {
            this.logger.info("[_execute] executing: %s", this._sql, params);
        }

        if (this.isPrepared)
        {
            return this._execute(params);
        }

        return this.prepare()
            .then(() => this._execute(params))
            ;
    }

    _execute(params)
    {
        if (!this.isConnected) {
            return Promise.reject('NotConnected.');
        }

        if (!this._statement) {
            return Promise.reject('NotPrepared.');
        }

        return new Promise((resolve, reject) => {
            params = this._driver._massageParams(params);

            this._statement.execute(params, (err, results, fields) => {
                if (err) {
                    this.logger.error("[_execute] ERROR.", this._sql, err);
                    reject(err);
                    return;
                }
                if (this._isDebug) {
                    this.logger.info("[_execute] DONE.", this._sql, results);
                }
                resolve(results);
            });
        });
    }

    prepare()
    {
        this._logger.info('[prepare] BEGIN: %s', this._sql);
        if (this._statement) {
            return Promise.resolve();
        }

        if (this._isPreparing) {
            return new Promise((resolve, reject) => {
                this._waiters.push({
                    resolve,
                    reject
                })
            });
        }
        this._isPreparing = true;

        return new Promise((resolve, reject) => {
            this._waiters.push({
                resolve: resolve,
                reject: reject
            });

            if (!this.isConnected) {
                this._handlePrepareError('Not Connected', new HandledError("Not Connected"));
                return; 
            }
            this._driver._connection.prepare(this._sql, (err, statement) => {                
                if (err)
                {
                    this._handlePrepareError('Failed to prepare', err);
                    return;
                }

                this.logger.info('[prepare] prepared: %s. inner id: %s', this._sql, statement.id);
                this._isPreparing = false;
                this._statement = statement;

                for(var x of this._waiters)
                {
                    x.resolve();
                }
                this._waiters = [];
            });
        });
    }

    _handlePrepareError(message, error)
    {
        this.logger.error('[_handlePrepareError] failed to prepare statement. %s', message, this._sql, error);
        this._statement = null;
        this._isPreparing = false;
        for(var x of this._waiters)
        {
            x.reject(error);
        }
        this._waiters = [];
    }


}

module.exports = MySqlStatement;