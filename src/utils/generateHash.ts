
export const generateHash = () : string => {
    return Buffer.from(Date.now().toString()).toString("base64")
}