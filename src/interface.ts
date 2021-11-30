import {BigInt, Bit, Char, Text, Date, DateTime, Int, ISqlTypeFactoryWithNoParams, } from "mssql";



export interface PQuery 
{
    value: string;
    type: ISqlTypeFactoryWithNoParams;
}



//Interfaces, um die Auth-Request zu verarbeiten

export interface IAuthRequest
{
    type: "RequestKey" | "AuthUser"
    username?: string;
    password?: string;
    SessionID?: string;
}