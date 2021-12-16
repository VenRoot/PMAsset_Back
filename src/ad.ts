import ActiveDirectory from "activedirectory2";
import bcrypt from "bcrypt";

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
export const checkUser = (username: string, password: string, callback: (user?: boolean | null, err?: string) => void) => {
    //@ts-ignore
    ad.authenticate(username, password, (err:err , auth) => {
    if (err) {
        console.log(err.lde_message);
        if(typeof err.lde_message != "string") callback(undefined, err.lde_message); 
        if(err.lde_message.includes("data 52e")) callback(undefined, "Invalid password!");
        else if(err.lde_message.includes("data 525")) callback(undefined, "User not found!");
        else if(err.lde_message.includes("data 533")) callback(undefined, "Account disabled!");
        else if(err.lde_message.includes("data 701")) callback(undefined, "Account expired!");
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