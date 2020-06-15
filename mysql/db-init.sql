USE `sample-db`;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `contacts` (
  `id` BINARY(16) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;