class HeaderService {
    private getToken(): string {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required. Please login to continue.');
        }
        return token;
    }

    getHeaders() {
        try {
            const token = this.getToken();
            console.log('HeaderService - Token retrieved:', { 
                hasToken: !!token,
                tokenLength: token?.length,
                tokenPrefix: token?.substring(0, 20) + '...'
            });
            // Remove 'Bearer' prefix as it's already included in the stored token
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            };
            console.log('HeaderService - Headers created:', { 
                hasAuth: !!headers.Authorization,
                authLength: headers.Authorization?.length
            });
            return headers;
        } catch (error) {
            console.error('HeaderService - Error getting headers:', error);
            throw error;
        }
    }
    handleError(error: any) {
        console.error('API Error:', error.response || error);

        if (error.response?.status === 401) {
            // Clear token and throw authentication error
            localStorage.removeItem('token');
            localStorage.removeItem('phoneNumber');
            // Clear cart data when session expires
            localStorage.removeItem('gp_store_cart');
            localStorage.removeItem('gp_store_cart_delivery_info');
            // Dispatch event to notify cart context
            window.dispatchEvent(new Event('tokenRemoved'));
            throw new Error('Session expired. Please login again.');
        }

        if (error.response?.status === 403) {
            throw new Error('You do not have permission to perform this action.');
        }

        if (error.response?.status === 404) {
            throw new Error('Address not found.');
        }

        throw new Error(error.response?.data?.message || error.message || 'An error occurred while processing your request.');
    }
}
export const headerService = new HeaderService();
