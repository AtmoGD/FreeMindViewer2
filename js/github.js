var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var FreeMindViewer;
(function (FreeMindViewer) {
    FreeMindViewer.path = "https://free-mind-viewer-2.herokuapp.com";
    function authorize() {
        if (FreeMindViewer.loginSpan.innerText != "") {
            logout();
            return;
        }
        let state = generateAndSaveState(15);
        window.location.href = FreeMindViewer.path + "?a=auth&state=" + state; //Tell the server to redirect the client to github
    }
    FreeMindViewer.authorize = authorize;
    function logout() {
        FreeMindViewer.loginSpan.innerText = "";
        deleteCookie("at");
        FreeMindViewer.loginButton.innerText = "Login to Github";
    }
    FreeMindViewer.logout = logout;
    function fetchAccesstokenAndLogin(_code, _state) {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield fetchAccesstoken(_code, _state)) {
                login();
            }
            else {
                console.error("Error#02: Not able to fetch accesstoken");
                alert("Not able to fetch accesstoken!");
            }
        });
    }
    FreeMindViewer.fetchAccesstokenAndLogin = fetchAccesstokenAndLogin;
    function login() {
        return __awaiter(this, void 0, void 0, function* () {
            let username = yield fetchUsername();
            FreeMindViewer.loginSpan.innerText = username;
            FreeMindViewer.loginButton.innerText = "Logout";
        });
    }
    FreeMindViewer.login = login;
    function saveFile(_file) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            let owner = (_a = document.querySelector("#ownerInput")) === null || _a === void 0 ? void 0 : _a.value;
            let repo = (_b = document.querySelector("#repoInput")) === null || _b === void 0 ? void 0 : _b.value;
            let repoPath = (_c = document.querySelector("#pathInput")) === null || _c === void 0 ? void 0 : _c.value;
            let branch = (_d = document.querySelector("#branchInput")) === null || _d === void 0 ? void 0 : _d.value;
            if (owner == "" || repo == "" || repoPath == "" || branch == "")
                return;
            let url = FreeMindViewer.path + "?a=saveFile&at=" + getCookie("at") + "&owner=" + owner + "&name=" + repo + "&path=" + repoPath + "&branch=" + branch;
            let response = yield fetch(url, {
                method: "POST",
                headers: { "Content-Type": "text/plain" },
                body: btoa(_file)
            });
            alert(yield response.text());
        });
    }
    FreeMindViewer.saveFile = saveFile;
    function fetchFile() {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            let owner = (_a = document.querySelector("#ownerInput")) === null || _a === void 0 ? void 0 : _a.value;
            let repo = (_b = document.querySelector("#repoInput")) === null || _b === void 0 ? void 0 : _b.value;
            let repoPath = (_c = document.querySelector("#pathInput")) === null || _c === void 0 ? void 0 : _c.value;
            let branch = (_d = document.querySelector("#branchInput")) === null || _d === void 0 ? void 0 : _d.value;
            if (owner == "" || repo == "" || repoPath == "" || branch == "")
                return;
            let url = FreeMindViewer.path + "?a=getFile&at=" + getCookie("at") + "&owner=" + owner + "&name=" + repo + "&path=" + repoPath + "&branch=" + branch;
            let res = yield fetch(url);
            let text = yield res.text();
            FreeMindViewer.fetchXML(text);
        });
    }
    FreeMindViewer.fetchFile = fetchFile;
    function fetchUsername() {
        return __awaiter(this, void 0, void 0, function* () {
            let url = FreeMindViewer.path + "?a=fetchUsername&at=" + getCookie("at");
            let response = yield fetch(url);
            let username = yield response.text();
            return username ? username : "Not able to fetch Username";
        });
    }
    FreeMindViewer.fetchUsername = fetchUsername;
    function fetchAccesstoken(_code, _state) {
        return __awaiter(this, void 0, void 0, function* () {
            let url = FreeMindViewer.path + "?a=fetchToken&code=" + _code + "&state=" + _state;
            let response = yield fetch(url);
            let auth = yield response.text();
            if (auth) {
                setCookie("at", auth);
                return true;
            }
            return false;
        });
    }
    FreeMindViewer.fetchAccesstoken = fetchAccesstoken;
    function getCookie(name) {
        var _a;
        const value = "; " + document.cookie;
        const parts = value.split("; " + name + "=");
        if (parts.length == 2) {
            return (_a = parts.pop()) === null || _a === void 0 ? void 0 : _a.split(";").shift();
        }
        return undefined;
    }
    FreeMindViewer.getCookie = getCookie;
    function setCookie(_name, _val) {
        const date = new Date();
        const value = _val;
        // Set it expire in 7 days
        date.setTime(date.getTime() + (7 * 24 * 60 * 60 * 1000));
        // Set it
        document.cookie = _name + "=" + value + "; expires=" + date.toUTCString() + "; path=/";
    }
    FreeMindViewer.setCookie = setCookie;
    function generateAndSaveState(_lenght) {
        let state = generateState(_lenght);
        setCookie("state", state);
        return state;
    }
    FreeMindViewer.generateAndSaveState = generateAndSaveState;
    function deleteCookie(_name) {
        const date = new Date();
        date.setTime(date.getTime() - 1000);
        document.cookie = _name + "=" + "; expires=" + date.toUTCString() + "; path=/"; // use string template
    }
    FreeMindViewer.deleteCookie = deleteCookie;
    function generateState(_length) {
        let result = "";
        let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"; // char functions exist
        let charactersLength = characters.length;
        for (let i = 0; i < _length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }
})(FreeMindViewer || (FreeMindViewer = {}));
//# sourceMappingURL=github.js.map