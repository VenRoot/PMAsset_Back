import {BigInt, Bit, Char, Text, Date, DateTime, Int, ISqlTypeFactoryWithNoParams, } from "mssql";

type DevType = "PC" | "Phone" | "Monitor" | "Konferenz";
type phoneTypes = "iPhone 6" | "iPhone 6S" | "iPhone 6 Plus" | "iPhone 6S Plus" | "iPhone SE" | "iPhone 7" | "iPhone 7 Plus" | "iPhone 7S" | "iPhone 7S Plus" | "iPhone 8" | "iPhone 8 Plus" | "iPhone X" | "iPhone XS" | "iPhone XS Max" | "iPhone XR" | "iPhone 11" | "iPhone 11 Pro" | "iPhone 11 Pro Max" | "iPhone SE 2. Gen" | "iPhone 12" | "iPhone 13" | "iPhone 13 Mini" | "iPhone 13 Pro" | "iPhone 13 Pro Max";
type MonTypes = "22" | "24" | "27" | "32";
type MonHersteller = "Samsung" | "LG" | "Dell";

export type PCHersteller = "Haug" | "Lenovo" | "Microsoft"
export type PCTypes = "Tower" | "CAD" | "T430" | "T450" | "T470"  | "T480" | "T490" | "T14";

export interface PQuery
{
    name: string;
    value: any;
    type: ISqlTypeFactoryWithNoParams;
}

export type PQueryArray = PQuery

interface Device {
    seriennummer: string;
    it_nr: string;
    status: string;
    standort: string;
    besitzer?: string;
    form: string;
}
interface PCEntry extends Device
{
    kind: "PC";
    equipment: string[];
    type: PCTypes;
    hersteller: PCHersteller;
    passwort: string;
    kommentar?: string;
}

let x:PCEntry = {
    kind: "PC",
    seriennummer: "1234567890",
    it_nr: "IT002020",
    status: "Inaktiv",
    standort: "Aichtal",
    equipment: [],
    type: "CAD",
    hersteller: "Haug",
    passwort: "Passwort",
    besitzer: "Max Mustermann",
    form: "Nein"
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
    model: string;
}

interface KonferenzEntry extends Device
{
    kind: "Konferenz";
    hersteller: string;
    model: string;
}

interface IEntry {
    search: string;
    value: string;
};

interface IEntryPC extends IEntry
{
    kind: "PC";
    hersteller?: PCHersteller;
    type?: PCTypes;
}

interface IEntryMonitor extends IEntry
{
    kind: "Monitor";
    hersteller?: MonHersteller;
    type?: MonTypes;
}

interface IEntryPhone extends IEntry
{
    kind: "Phone";
    type?: phoneTypes;
}

interface IEntryKonferenz extends IEntry
{
    kind: "Konferenz";
}

export type IEntryDevices = IEntryPC | IEntryMonitor | IEntryPhone | IEntryKonferenz;
export type Item = PCEntry | MonitorEntry | PhoneEntry | KonferenzEntry;


//Interfaces, um die Auth-Request zu verarbeiten

export interface IAuthRequest
{
    type: "RequestKey" | "AuthUser"
    username?: string;
    password?: string;
    ADtoken?: string;
    SessionID?: string;
}
export interface ICheckRequest
{
    username: string;
    SessionID: string;
}

export interface IAADToken
{
        aud: string,
        iss: string,
        iat: number, //authentifizierungszeitpunkt
        nbf: number, 
        exp: number, //verfallszeitpunkt
        name: string,
        nonce: string,
        oid: string,
        preferred_username: string, //mail
        rh: string,
        sub: string,
        tid: string,
        uti: string,
        ver: string
}

export interface IGetEntriesRequest
{
    type: "PC" | "Monitor" | "Phone" | "Konferenz" | "MA" | "ALL" | "ALLALL";
    Mail?: `${string}.${string}***REMOVED***.com`;
}