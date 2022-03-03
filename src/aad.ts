import fs from "fs";
import {PublicClientApplication, Configuration, AzureCloudInstance} from "@azure/msal-node";
import * as msal from "@azure/msal-node";

const cachePath = process.env.AAD_CACHE_PATH;
if(!cachePath) throw new Error("AAD_CACHE_PATH environment variable is not set");


// Call back APIs which automatically write and read into a .json file - example implementation
const beforeCacheAccess = async (cacheContext: any) => {
    cacheContext.tokenCache.deserialize(fs.readFileSync(cachePath, "utf-8"));
};

const afterCacheAccess = async (cacheContext: any) => {
    if(cacheContext.cacheHasChanged){
        fs.writeFileSync(cachePath, cacheContext.tokenCache.serialize());
    }
};

// Cache Plugin
const cachePlugin = {
    beforeCacheAccess,
    afterCacheAccess
};;

const msalConfig:Configuration = {
    auth: {
        clientId: "enter_client_id_here",
        authority: "https://login.microsoftonline.com/common",
        knownAuthorities: [],
        cloudDiscoveryMetadata: "",
        azureCloudOptions: {
            azureCloudInstance: AzureCloudInstance.AzureGermany, // AzureCloudInstance enum is exported as a "type",
            tenant: "enter_tenant_info" // defaults to "common"
        }
    },
    cache: {
        cachePlugin // your implementation of cache plugin
    },
    system: {
        loggerOptions: {
            loggerCallback(loglevel: string, message: string, containsPii: boolean) {
                console.log(message);
            },
            piiLoggingEnabled: false,
            logLevel: msal.LogLevel.Verbose,
        },
        proxyUrl: "",
    }
}

const msalInstance = new PublicClientApplication(msalConfig);