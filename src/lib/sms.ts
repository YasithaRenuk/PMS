interface SendSMSResponse {
    status: string;
    message: string;
    data?: any;
    errors?: any;
}

export const sendSMS = async (contactNumber: string, message: string): Promise<string> => {
    try {
        const MSISDN = contactNumber;
        const SRC = process.env.SENDER_ID || "";
        const AUTH = process.env.SEND_LK_API_KEY || "";
        
        if (!AUTH) {
            console.error("SEND_LK_API_KEY is not defined in environment variables");
            return "Error: SMS API Key missing";
        }

        console.log(`Sending SMS to ${contactNumber}`);

        const msgdata = {
            recipient: MSISDN,
            sender_id: SRC,
            message: message
        };

        const requestOption = {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${AUTH}`,
                'Cache-Control': 'no-cache',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(msgdata)
        };

        const response = await fetch('https://sms.send.lk/api/v3/sms/send', requestOption);
        const text = await response.text();
        console.log("SMS API Response:", text);
        return text;

    } catch (err) {
        console.error("SMS Sending Error:", err);
        return String(err);
    }
}
