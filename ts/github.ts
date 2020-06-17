namespace FreeMindViewer {
  export function authorize(): void {
    let state: string = generateAndSaveState(15);
    window.location.href = "http://localhost:5001?a=auth&state=" + state;                      //Tell the server to redirect the client to github
  }

  export async function fetchAccesstokenAndLogin(_code: string, _state: string): Promise<void> {
    if (await fetchAccesstoken(_code, _state)) {
      // await login();
    }
    else {
      console.error("Error#02: Not able to fetch accesstoken");
      alert("Not able to fetch accesstoken!");
    }
  }

  export async function fetchAccesstoken(_code: string, _state: string): Promise<boolean> {
    let url: string = "http://localhost:5001/?a=fetchToken&code=" + _code + "&state=" + _state;
    let response: Response = await fetch(url);
    let auth: string = await response.text();
    if (auth) {
      setCookie("at", auth);
      return true;
    }
    return false;
  }

  export function getCookie(name: string): string | undefined {
    const value: string = "; " + document.cookie;
    const parts: string[] = value.split("; " + name + "=");

    if (parts.length == 2) {
      return parts.pop()?.split(";").shift();
    }
    return undefined;
  }

  export function setCookie(_name: string, _val: string): void {
    const date: Date = new Date();
    const value: string = _val;

    // Set it expire in 7 days
    date.setTime(date.getTime() + (7 * 24 * 60 * 60 * 1000));

    // Set it
    document.cookie = _name + "=" + value + "; expires=" + date.toUTCString() + "; path=/";
  }
  export function generateAndSaveState(_lenght: number): string {
    let state: string = generateState(_lenght);
    setCookie("state", state);
    return state;
  }

  export function deleteCookie(_name: string): void {
    const date: Date = new Date();
    date.setTime(date.getTime() - 1000);
    
    document.cookie = _name + "=" + "; expires=" + date.toUTCString() + "; path=/";  // use string template
  }
  
  function generateState(_length: number): string {
    let result: string = "";
    let characters: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";  // char functions exist
    let charactersLength: number = characters.length;
    for (let i: number = 0; i < _length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
}