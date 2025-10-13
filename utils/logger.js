// utils/logger.js
const chalk = require('chalk');

function info(message) {
    console.log(chalk.blue(`[INFO] ${message}`));
}

function warn(message) {
    console.log(chalk.yellow(`[WARN] ${message}`));
}

function error(message) {
    console.log(chalk.red(`[ERROR] ${message}`));
}

function success(message) {
    console.log(chalk.green(`[SUCCESS] ${message}`));
}

module.exports = { info, warn, error, success };
