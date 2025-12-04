import axios from "axios";

const sendWhatsAppOtpByDovesoft = async (phoneNumber: string, otp: string) => {
    try {
        const response = await axios.post(
            "https://api.dovesoft.io//REST/directApi/message",
            {
                messaging_product: "whatsapp",
                to: phoneNumber,
                type: "template",
                template: {
                    name: "otp_verify",
                    language: {
                        code: "en",
                        policy: "deterministic",
                    },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                {
                                    type: "text",
                                    text: otp,
                                },
                            ],
                        },
                        {
                            type: "button",
                            sub_type: "url",
                            index: 0,
                            parameters: [
                                {
                                    type: "text",
                                    text: otp,
                                },
                            ],
                        },
                    ],
                },
            },
            {
                headers: {
                    "content-type": "application/json",
                    wabaNumber: process.env.DOVESOFT_WABA_PHONE_NUMBER,
                    Key: process.env.DOVESOFT_API_KEY,
                },
            }
        );
        return { ok: true, message: "OTP sent successfully", data: response.data };
    } catch (error: any) {
        console.error("Dovesoft OTP Error:", error.response?.data || error.message);
        return {
            ok: false,
            message: error.response?.data?.error?.message || error.message,
            error,
        };
    }
};

export const sendWhatsAppMessageByDovesoft = async (type: string, phoneNumber: string, data: any) => {
    if (type === "otp") {
        return await sendWhatsAppOtpByDovesoft(phoneNumber, data.otp);
    }
    // Add more types as needed
    return { ok: false, message: `Unsupported message type: ${type}` };
};
