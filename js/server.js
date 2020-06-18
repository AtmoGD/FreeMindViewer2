"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const HTTP = require("http");
const Url = require("url");
const auth_1 = require("@octokit/auth");
const rest_1 = require("@octokit/rest");
const CLIENT_ID = "47db66f43b3e5e0c0b25";
const CLIENT_SECRET = "d1abfd3be9efe995399faad6a2f947b2dc4149a9";
const SCOPE = "repo, user";
var FreeMindViewer;
(function (FreeMindViewer) {
    let server = HTTP.createServer();
    let port = process.env.PORT;
    if (port == undefined)
        port = 5001;
    server.listen(port);
    server.addListener("request", handleRequest);
    function handleRequest(_request, _response) {
        return __awaiter(this, void 0, void 0, function* () {
            if (_request.url) {
                _response.setHeader("Access-Control-Allow-Origin", "*");
                _response.setHeader("Content-Type", "json");
                let url = Url.parse(_request.url, true);
                let parameters = getParameters(url);
                console.log(parameters);
                if (parameters.action) {
                    switch (parameters.action) {
                        case "auth":
                            yield auth(_request, _response, CLIENT_ID, SCOPE, parameters);
                            break;
                        case "fetchToken":
                            yield fetchToken(_request, _response, parameters);
                            break;
                        case "fetchUsername":
                            yield fetchUsername(_request, _response, parameters);
                            break;
                    }
                }
            }
            _response.end();
        });
    }
    function getParameters(_url) {
        let parameters = {
            action: _url.query["a"] ? _url.query["a"] : null,
            at: _url.query["at"] ? _url.query["at"] : null,
            repoName: _url.query["name"] ? _url.query["name"] : null,
            repoPath: _url.query["path"] ? _url.query["path"] : null,
            fileName: _url.query["fileName"] ? _url.query["fileName"] : null,
            path: _url.query["path"] ? _url.query["path"] : null,
            name: _url.query["owner"] ? _url.query["owner"] : null,
            sha: _url.query["sha"] ? _url.query["sha"] : null,
            state: _url.query["state"] ? _url.query["state"] : null,
            code: _url.query["code"] ? _url.query["code"] : null
        };
        return parameters;
    }
    function auth(_request, _response, _CLIENT_ID, _SCOPE, _parameters) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!_parameters.state)
                return;
            let url = "https://github.com/login/oauth/authorize";
            let params = new URLSearchParams("client_id=" + _CLIENT_ID + "&state=" + _parameters.state + "&scope=" + _SCOPE);
            url += "?" + params.toString();
            _response.writeHead(302, {
                "Location": url
            });
        });
    }
    function fetchToken(_request, _response, _parameters) {
        return __awaiter(this, void 0, void 0, function* () {
            if (_parameters.code && _parameters.state) {
                const auth = auth_1.createOAuthAppAuth({
                    clientId: CLIENT_ID,
                    clientSecret: CLIENT_SECRET
                });
                const appAuthentication = yield auth({
                    type: "token",
                    code: _parameters.code,
                    state: _parameters.state
                });
                let result = JSON.stringify(appAuthentication);
                let data = JSON.parse(result);
                _response.write(data ? data.token : "Err:#10001: No data available");
            }
            else {
                _response.write("Err:#10002: No token or state provided");
            }
        });
    }
    function fetchUsername(_request, _response, _parameters) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!_parameters.at) {
                _response.write("Err:#10003: No token provided");
                return;
            }
            const octokit = new rest_1.Octokit({
                auth: _parameters.at
            });
            let name = (yield octokit.users.getAuthenticated()).data.login;
            _response.write(name);
        });
    }
})(FreeMindViewer || (FreeMindViewer = {}));
//# sourceMappingURL=server.js.map