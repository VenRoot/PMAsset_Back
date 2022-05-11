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
    //@ts-ignore
    pageSize: 100000
});

console.log(process.env.AZURE_USER, process.env.AZURE_PASSWD);


interface err {
    lde_message: string;
}


//Create a hash of random 512 bits and salt it 10 times
export const generateSessionID = (): string => bcrypt.hashSync(crypto.randomBytes(64), 10);


export const allowedUsers = 
[
    "***REMOVED***",
    "***REMOVED***",
    "***REMOVED***",
    "***REMOVED***",
    "***REMOVED***",
    "***REMOVED***",
    "***REMOVED***",
    "***REMOVED***",
    "***REMOVED***",
    "***REMOVED***",
    "***REMOVED***",
    "***REMOVED***",
    "***REMOVED***",
    "***REMOVED***",
    "***REMOVED***",
    "***REMOVED***",
    "***REMOVED***",
    "***REMOVED***",
    "***REMOVED***",
    "***REMOVED***",
    "***REMOVED***",
    "***REMOVED***"
];

//make a function which will return a callback
export const checkUser = (username: string, password: string, callback: (user?: boolean | null, err?: string) => void) => {
    if(!allowedUsers.includes(username.split("@")[0])) return callback(null, "Dieser User ist nicht für die AD-Anmeldung freigegeben");
    // if(process.env.DEVMODE == "true") return callback(true);
    //@ts-ignore
    ad.authenticate(username, password, (err: err, auth) => {
        if (err) {
            console.log(err.lde_message);
            if (typeof err.lde_message != "string") return callback(undefined, err.lde_message);
            if (err.lde_message.includes("data 52e")) return callback(undefined, "Invalid password!");
            else if (err.lde_message.includes("data 525")) return callback(undefined, "User not found!");
            else if (err.lde_message.includes("data 533")) return callback(undefined, "Account disabled!");
            else if (err.lde_message.includes("data 701")) return callback(undefined, "Account expired!");
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

export let AllUsers: any;


//Alle 10 Minuten wird das AD aktualisiert
setInterval(async () => {
    AllUsers = await getAllUsers();
}, 1000 * 60 * 10);

setTimeout(async() => {
    AllUsers = await getAllUsers();
}, 1000*5);

export const getAllUsers = () => new Promise((resolve, reject) => {
    if(AllUsers) return resolve(AllUsers);
    // ad.findUsers({
    //     filter: "objectClass=user",
    //     attributes: {user: ["sAMAccountName", "displayName"], group: ["cn"]},
    //     includeMembership: ["all"],
    //     sizeLimit: 0,
    //     timeLimit: 10,
    //     tlsOptions: {rejectUnauthorized: false},
    ***REMOVED***",
    // }, (err, users: any[]) => {
    //     if (err) {
    //         console.error(err);
    //         reject(JSON.stringify(err));
    //     }
    //     if (!users) {
    //         console.error("No users found");
    //         reject("No users found");
    //     }
    //     resolve(users.map(user => user.sAMAccountName));
    // });
    const attributes = [
        'name', 
        'mail',
        'employeeNumber',
        'department', //Betriebsleitung
        'departmentNumber',
        'title', 
        'telephoneNumber', 
        'mobile', 
        'physicalDeliveryOfficeName', //Gebäude 1, 1. OG
        // 'streetAddress', 
        // 'postOfficeBox', 
        'l', //Aichtal
        'st', //Baden-Württemberg
        'postalCode', //72155
        'co', //Deutschland
        // 'c',  //DE
        // 'whenCreated', 
        // 'pwdLastSet', 
        // 'userAccountControl', 
        // 'sAMAccountName', //LoefflerM
        'userPrincipalName', //Markus.Loeffler***REMOVED***.com
        // 'distinguishedName', 
        // 'objectCategory', 
        'cn', //***REMOVED***
        // 'description', 
        // 'whenChanged', 
        // 'employeeID', //93
        // 'sn', //Löffler
        // 'givenName', //Markus
        // 'displayName', //***REMOVED*** (selbe wie cn)
        // 'objectGUID', //{00000000-0000-0000-0000-000000000000} 
        // 'objectSid', //S-1-5-21-2499678901-816157776-2499678901-500
        // 'primaryGroupID', 
        // 'objectClass', 
        'memberOf' //Gruppen wie DE GRU DriveMapping P
    ];

    // const adFilter = (search: string) => [
    //     '(&(objectCategory=person)(objectClass=user)',
    //     '(|',
    //     // `(initials=*)`,
    //     // `(cn=*)`,
    //     `(mail=*)`,
    //     // `(employeeNumber=*)`,
    //     `(departmentNumber=*)`,

    //     // `(userPrincipalName=*)`,
    //     // `(proxyAddresses=*)`,
    //     '))'
    // ].join('');
    let opt = {
        paging: {
            pageSize: 100000
        },
        attributes: attributes,
        //   filter: filter
    };

    //@ts-ignore
    ad.findUsers(opt, (err, user:users[]) => {
        if (err) throw err;
        if (err) return reject(err as any);
        
        let z = performance.now();

        // fs.writeFileSync("./users.json", JSON.stringify(user, undefined, 4));

        
        let count = 0;
        let uss = user.filter(us => {
            count++;
            if(!Array.isArray(us.memberOf)) 
            {
                // console.log("Out")
                return false;
            }
            let found = false;
            us.memberOf.forEach(y => {
                if(y.includes("All Users - Putzmeister")) 
                {
                    found = true;
                    return;
                }
            });
            return found;
        });
        console.log(user.length);
        console.log(count);
        console.log(performance.now() - z + "ms");
        uss = uss
        resolve(uss);
        
        // resolve(user.filter(us => Array.isArray(us.memberOf as string[]) ? us.memberOf.filter(x => x.includes("All Users - Putzmeister")) : false));

        // resolve(user.filter(us => (us.memberOf as string[])?.includes("CN=All Users - Putzmeister,OU=DE,OU=Groups,OU=RealmJoin,OU=OneIT,DC=***REMOVED***,DC=net")) as any);
        // resolve(user as any);
    });
});

let x =
{
    all: 1
}

interface users
{
    mail: string,
    name: string, 
    employeeNumber: string,
    department: string,
    departmentNumber: string,
    title: string,
    telephoneNumber: string,
    mobile: string,
    physicalDeliveryOfficeName: string,
    l: string,
    st: string,
    postalCode: string,
    co: string,
    userPrincipalName: string,
    cn: string,
    memberOf: string[]
}

export const getUserInfo = (username: string, callback: (user?: any | null, err?: string) => void) => {

    const attributes = [
        // 'displayName',
        'department',
        'departmentNumber',
        'name'
    ];

    const adFilter = (search: string) => [
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
        if (err) throw err;
        if (err) return callback(undefined, err as any);

        callback(user as any);
    });
};