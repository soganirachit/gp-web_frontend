import { errorMessageFromParsedBody } from "../utils/apiErrorMessage";

class HeaderService {
    getHeaders() {
        const token = localStorage.getItem('access_token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        };
    }

    handleError(error: any) {
        if (error.response?.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('phoneNumber');
            localStorage.removeItem('userName');
            localStorage.removeItem('userId');
            localStorage.removeItem('gp_store_cart');
            localStorage.removeItem('gp_store_cart_delivery_info');
            window.dispatchEvent(new Event('tokenRemoved'));
            throw new Error('Session expired. Please login again.');
        }

        if (error.response?.status === 403) {
            throw new Error('You do not have permission to perform this action.');
        }

        if (error.response?.status === 404) {
            const fromBody = errorMessageFromParsedBody(error.response?.data, "");
            if (fromBody.trim()) {
                throw new Error(fromBody);
            }
            throw new Error("Not found.");
        }

        throw new Error(error.response?.data?.message || error.message || 'An error occurred while processing your request.');
    }
}
export const headerService = new HeaderService();
