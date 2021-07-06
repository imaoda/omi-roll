"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true,
});
exports.devOrBuild = devOrBuild;
exports.deploy = deploy;

var assert = _interopRequireWildcard(require("assert"));

var _child_process = require("child_process");

var _path = require("path");

var _fs = require("fs");

var _mkdirp = require("mkdirp");

var _ghPages = _interopRequireDefault(require("gh-pages"));

var _chalk = _interopRequireDefault(require("chalk"));

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};
    if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          var desc =
            Object.defineProperty && Object.getOwnPropertyDescriptor
              ? Object.getOwnPropertyDescriptor(obj, key)
              : {};
          if (desc.get || desc.set) {
            Object.defineProperty(newObj, key, desc);
          } else {
            newObj[key] = obj[key];
          }
        }
      }
    }
    newObj.default = obj;
    return newObj;
  }
}

// userConfig 是从 Bigfish 过来的，用于传入额外的配置信息
// 这部分信息需要写入到临时文件，因为在 doczrc.ts 里无法读取到他
// TODO: userConfig 无法用函数
function devOrBuild({ cwd, cmd, params, userConfig = {} }) {
  process.chdir(cwd);
  (0, _mkdirp.sync)((0, _path.join)(cwd, ".docz"));
  (0, _fs.writeFileSync)(
    (0, _path.join)(cwd, ".docz", ".umirc.library.json"),
    JSON.stringify(userConfig, null, 2),
    "utf-8"
  );
  return new Promise((resolve, reject) => {
    const binPath = require.resolve("docz/bin/index.js");

    assert.ok(
      !params.includes("--config"),
      `
Don't use --config, config under doc in .umirc.library.js

e.g.

export default {
  doc: {
    themeConfig: { mode: 'dark' },
  },
};
      `.trim()
    ); // test 时走 src/doc.ts，这时没有 doczrc.js

    if (__dirname.endsWith("src")) {
      params.push("--config", (0, _path.join)(__dirname, "../lib/doczrc.js"));
    } else {
      params.push("--config", (0, _path.join)(__dirname, "doczrc.js"));
    }

    if (!params.includes("--port") && !params.includes("-p")) {
      params.push("--port", "8001");
    }

    if (params.includes("-h")) {
      params.push("--help");
    }

    const child = (0, _child_process.fork)(binPath, [cmd, ...params], {
      cwd,
      env: process.env,
    });
    child.on("exit", (code) => {
      if (code === 1) {
        reject(new Error("Doc build failed"));
      } else {
        resolve();
      }
    });
  });
}

function deploy({ cwd, args }) {
  return new Promise((resolve, reject) => {
    const distDir = (0, _path.join)(cwd, ".docz/dist");
    assert.ok(
      (0, _fs.existsSync)(distDir),
      `Please run ${_chalk.default.green(`roll doc build`)} first`
    );

    _ghPages.default.publish(distDir, args, (err) => {
      if (err) {
        reject(new Error(`Doc deploy failed. ${err.message}`));
      } else {
        resolve();
      }
    });
  });
}
