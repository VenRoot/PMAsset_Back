import ActiveDirectory from "activedirectory2";
import bcrypt from "bcrypt";

import {Sessions} from "./session";

const ad = new ActiveDirectory({
    url: "ldap:***REMOVED***",
    baseDN: "dc=***REMOVED***,dc=net",
    username: process.env.AZURE_USER as string,
    password: process.env.AZURE_PASSWD as string,
});

console.log(process.env.AZURE_USER, process.env.AZURE_PASSWD);


interface err{
    lde_message: string;
}



export const generateSessionID = (): string => bcrypt.hashSync(Math.random().toString(), 10);



//make a function which will return a callback
export function checkUser(username: string, password: string, callback: (user: boolean) => void) {
    return new Promise((resolve, reject) =>  {
        //@ts-ignore
        ad.authenticate(username, password, (err:err , auth) => {
            if (err) {
                console.log(err);
                if(typeof err.lde_message != "string") reject(err.lde_message); 
                if(err.lde_message.includes("data 52e")) reject("Invalid password!");
                else if(err.lde_message.includes("data 525")) reject("User not found!");
                else if(err.lde_message.includes("data 533")) reject("Account disabled!");
                else if(err.lde_message.includes("data 701")) reject("Account expired!");
                else reject(err); 
                return;
            }
            if (!auth) {
                console.error("User not found");
                reject("User not found");
            }        
            callback(auth);
        });
    });
}