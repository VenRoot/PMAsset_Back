import ActiveDirectory from "activedirectory2";
import bcrypt from "bcrypt";

import {Sessions} from "./session";

const ad = new ActiveDirectory({
    url: "ldap:***REMOVED***",
    baseDN: "dc=***REMOVED***,dc=net",
    username: "PMWNTMAIl\\***REMOVED***",
    password: "***REMOVED***",
});

interface err{
    lde_message: string;
}



export const generateSessionID = (): string => bcrypt.hashSync(Math.random().toString(), 10);



//make a function which will return a callback
export function checkUser(username: string, password: string, callback: (user: boolean) => void) {
    return new Promise((resolve, reject) =>  {
        //@ts-ignore
        ad.authenticate(username, password, (err:err , user) => {
            if (err) {
                console.log(err);
                console.log(typeof err)

                if(err.lde_message.includes("data 52e")) reject("Wrong Username or password!");
                else reject(err); 
            }
            if (!user) {
                console.error("User not found");
                reject("User not found");
            }        
            callback(user);
        });
    });
}