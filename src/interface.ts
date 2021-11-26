import {BigInt, Bit, Char, Text, Date, DateTime, Int, ISqlTypeFactoryWithNoParams, } from "mssql";



export interface PQuery 
{
    value: string;
    type: ISqlTypeFactoryWithNoParams;
}
