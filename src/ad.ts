import ActiveDirectory from "activedirectory2";

const ad = new ActiveDirectory({
    url: "ldap:***REMOVED***",
    baseDN: "dc=***REMOVED***,dc=net",
    username: "PMWNTMAIl\\***REMOVED***",
    password: "***REMOVED***",
});




//make a function which will return a callback
export function checkUser(username: string, password: string, callback: (user: boolean) => void) {
    ad.authenticate(username, password, (err, user) => {
        if (err) {
            console.error(err);
            return;
        }
        if (!user) {
            console.error("User not found");
            return;
        }
        callback(user);
    });
}