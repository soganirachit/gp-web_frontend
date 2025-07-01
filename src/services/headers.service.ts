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
            // Remove 'Bearer' prefix as it's already included in the stored token
            return {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            };
        } catch (error) {
            throw error;
        }
    }
    handleError(error: any) {
        console.error('API Error:', error.response || error);

        if (error.response?.status === 401) {
            // Clear token and throw authentication error
            localStorage.removeItem('token');
            localStorage.removeItem('phoneNumber');
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
