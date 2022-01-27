import ActiveDirectory from "activedirectory2";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { performance } from "perf_hooks";
import fs from "fs";

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


//Create a hash of random 512 bits and salt it 10 times
export const generateSessionID = (): string => bcrypt.hashSync(crypto.randomBytes(64), 10);



//make a function which will return a callback
export const checkUser = (username: string, password: string, callback: (user?: boolean | null, err?: string) => void) => {
    // if(process.env.DEVMODE == "true") return callback(true);
    //@ts-ignore
    ad.authenticate(username, password, (err:err , auth) => {
    if (err) {
        console.log(err.lde_message);
        if(typeof err.lde_message != "string") return callback(undefined, err.lde_message); 
        if(err.lde_message.includes("data 52e")) return callback(undefined, "Invalid password!");
        else if(err.lde_message.includes("data 525")) return callback(undefined, "User not found!");
        else if(err.lde_message.includes("data 533")) return callback(undefined, "Account disabled!");
        else if(err.lde_message.includes("data 701")) return callback(undefined, "Account expired!");
        else callback(undefined, err.lde_message); 
        return;
    }
    if (!auth) {
        console.error("User not found");
        callback(undefined, "User not found");
    }        
    callback(auth);
});
}

export const getUserInfo = (username: string, callback: (user?: any | null, err?: string) => void) => {

    const attributes = [
        // 'displayName',
        'department',
        'departmentNumber',
        'name'
    ];

    const adFilter = (search:any) => [
        '(&(objectCategory=person)(objectClass=user)',
        '(|',
        `(initials=${search})`,
        `(cn=${search.replace(/\s/g, '*')}*)`,
        `(mail=${search})`,
        `(userPrincipalName=${search})`,
        `(proxyAddresses=*:${search})`,
        '))'
      ].join('');

      let filter = adFilter(username);
      let opt = {
          attributes: attributes,
          filter: filter
      };

      //@ts-ignore
    ad.findUser(opt, username, (err, user) => {
        if(err) throw err;
        console.log(user);
        if(err) return callback(undefined, err as any);
        
        callback(user as any);
    });
};