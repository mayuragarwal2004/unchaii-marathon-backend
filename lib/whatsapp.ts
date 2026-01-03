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

const sendRegistrationSuccessWhatsApp = async (phoneNumber: string, name: string, distance: string, userId: string) => {
    try {
        const response = await axios.post(
            "https://api.dovesoft.io//REST/directApi/message",
            {
                messaging_product: "whatsapp",
                to: phoneNumber,
                type: "template",
                template: {
                    name: "reg_confirm_success",
                    language: {
                        code: "en",
                        policy: "deterministic",
                    },
                    components: [
                        {
                            type: "header",
                            parameters: [
                                {
                                    type: "image",
                                    image: {
                                        // Using QuickChart for better styling: margin=4 (padding), dark=0c0a09 (Stone-950 brand color)
                                        link: `https://quickchart.io/qr?text=${userId}&size=400&margin=4&dark=0c0a09&light=ffffff&format=png`,
                                    },
                                },
                            ],
                        },
                        {
                            type: "body",
                            parameters: [
                                {
                                    type: "text",
                                    text: name,
                                },
                                {
                                    type: "text",
                                    text: distance,
                                },
                            ],
                        },
                        {
                            type: "button",
                            sub_type: "url",
                            index: 0, // Dynamic URL index
                            parameters: [
                                {
                                    type: "text",
                                    text: userId, // Appended to base URL in template
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
        console.log("Dovesoft Reg Success Response:", response.data);

        return { ok: true, message: "Registration success message sent", data: response.data };
    } catch (error: any) {
        console.error("Dovesoft Reg Success Error:", error.response?.data || error.message);
        return {
            ok: false,
            message: error.response?.data?.error?.message || error.message,
            error,
        };
    }
};

const sendTicketConfirmationWhatsApp = async (
    phoneNumber: string,
    params: {
        name: string;
        category: string;
        bibNumber: string;
        counter: string;
        passLink?: string | null;
    }
) => {
    try {
        const response = await axios.post(
            "https://api.dovesoft.io//REST/directApi/message",
            {
                messaging_product: "whatsapp",
                to: phoneNumber,
                type: "template",
                template: {
                    name: "ticket_purchase_confirmation",
                    language: {
                        code: "en",
                        policy: "deterministic",
                    },
                    components: [
                        {
                            type: "header",
                            parameters: [
                                {
                                    type: "image",
                                    image: {
                                        link: params.passLink || "https://res.cloudinary.com/dxp7yksv6/image/upload/v1735824554/unchai-marathon/passes/placeholder.png", // Fallback placeholder
                                    },
                                },
                            ],
                        },
                        {
                            type: "body",
                            parameters: [
                                {
                                    type: "text",
                                    text: params.name,
                                },
                                {
                                    type: "text",
                                    text: params.category,
                                },
                                {
                                    type: "text",
                                    text: params.bibNumber,
                                },
                                {
                                    type: "text",
                                    text: params.counter,
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
        console.log("Dovesoft Ticket Confirmation Response:", response.data);

        return { ok: true, message: "Ticket confirmation message sent", data: response.data };
    } catch (error: any) {
        console.error("Dovesoft Ticket Confirmation Error:", error.response?.data || error.message);
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
    if (type === "register_success") {
        return await sendRegistrationSuccessWhatsApp(phoneNumber, data.name, data.distance, data.userId);
    }
    if (type === "ticket_confirmation") {
        return await sendTicketConfirmationWhatsApp(phoneNumber, {
            name: data.name,
            category: data.category,
            bibNumber: data.bibNumber,
            counter: data.counter,
            passLink: data.passLink,
        });
    }
    // Add more types as needed
    return { ok: false, message: `Unsupported message type: ${type}` };
};
