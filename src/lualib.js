"use strict";

const {
    LUA_VERSION_MAJOR,
    LUA_VERSION_MINOR
} = require("./lua.js");

const LUA_VERSUFFIX = "_" + LUA_VERSION_MAJOR + "_" + LUA_VERSION_MINOR;
module.exports.LUA_VERSUFFIX = LUA_VERSUFFIX;

module.exports.lua_assert = function(c) {};

const luabaselib = require("./lbaselib.js");

module.exports.luaopen_base = luabaselib.luaopen_base;
module.exports.luaopen_restricted = luabaselib.luaopen_restricted;

const LUA_TABLIBNAME = "table";
module.exports.LUA_TABLIBNAME = LUA_TABLIBNAME;
module.exports.luaopen_table = require("./ltablib.js").luaopen_table;

const LUA_STRLIBNAME = "string";
module.exports.LUA_STRLIBNAME = LUA_STRLIBNAME;
module.exports.luaopen_string = require("./lstrlib.js").luaopen_string;

const LUA_MATHLIBNAME = "math";
module.exports.LUA_MATHLIBNAME = LUA_MATHLIBNAME;
module.exports.luaopen_math = require("./lmathlib.js").luaopen_math;

const linit = require('./linit.js');
module.exports.luaL_openlibs = linit.luaL_openlibs;
