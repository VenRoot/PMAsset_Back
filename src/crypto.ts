import crypto from "crypto";

const algorythm = "aes-256-cbc";
const iv = crypto.randomBytes(16);

let key = crypto.createHash('sha256').update(String("Jaööp"));

interface data {
    iv: string;
    content: string;
    key: string;
}

export const generateKey = () => crypto.createHash('sha256').update(String(crypto.randomBytes(512).toString())).digest("base64").substring(0, 32);

export const decrypt = async (hash: data) =>
{
    const decipher = crypto.createDecipheriv(algorythm, hash.key, Buffer.from(hash.iv, 'hex'));

    const decrypted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);
    return decrypted.toString();
}

export const encrypt = async (password: string, sessionid: string) =>
{
    const cipther = crypto.createCipheriv(algorythm, sessionid, iv);
    const encrypted = Buffer.concat([cipther.update(password), cipther.final()]);

    return {
        iv: iv.toString("hex"),
        content: encrypted.toString("hex"),
        key: sessionid
    } as data;
}