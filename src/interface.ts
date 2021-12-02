import {BigInt, Bit, Char, Text, Date, DateTime, Int, ISqlTypeFactoryWithNoParams, } from "mssql";

type DevType = "PC" | "Phone" | "Monitor" | "Konferenz";
type phoneTypes = "iPhone 6" | "iPhone 6S" | "iPhone 6 Plus" | "iPhone 6S Plus" | "iPhone SE" | "iPhone 7" | "iPhone 7 Plus" | "iPhone 7S" | "iPhone 7S Plus" | "iPhone 8" | "iPhone 8 Plus" | "iPhone X" | "iPhone XS" | "iPhone XS Max" | "iPhone XR" | "iPhone 11" | "iPhone 11 Pro" | "iPhone 11 Pro Max" | "iPhone SE 2. Gen" | "iPhone 12" | "iPhone 13" | "iPhone 13 Mini" | "iPhone 13 Pro" | "iPhone 13 Pro Max";
type MonTypes = "22" | "24" | "27" | "32";
type MonHersteller = "Samsung" | "LG" | "Dell";

export type PCHersteller = "Haug" | "Lenovo"
export type PCTypes = "Tower" | "CAD" | "T430" | "T450" | "T470"  | "T480" | "T490" | "T14";

export interface PQuery
{
    name: string;
    value: string;
    type: ISqlTypeFactoryWithNoParams;
}

export type PQueryArray = [PQuery];

interface Device {
    seriennummer: string;
    it_nr: string;
    status: string;
    standort: string;
    besitzer?: string;
    form?: {
        [path: string]: string;
    };
}
interface PCEntry extends Device
{
    kind: "PC";
    type: PCTypes;
    hersteller: PCHersteller;
    passwort: string;
    
}
interface MonitorEntry extends Device
{
    kind: "Monitor";
    type: MonTypes;
    hersteller: MonHersteller;
    model: string;
}

interface PhoneEntry extends Device
{
    kind: "Phone";
    type: phoneTypes;
}

interface KonferenzEntry extends Device
{
    kind: "Konferenz";
}

export type Item = PCEntry | MonitorEntry | PhoneEntry | KonferenzEntry;


//Interfaces, um die Auth-Request zu verarbeiten

export interface IAuthRequest
{
    type: "RequestKey" | "AuthUser"
    username?: string;
    password?: string;
    SessionID?: string;
}
export interface IGetEntriesRequest
{
    username: string;
    SessionID: string;
}