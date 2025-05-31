// This is a simple ES module script to test the API directly
// Run with: node test-api.js

import fetch from 'node-fetch';

// Configuration
const BASE_URL = 'http://localhost:8000';
const API_URL = `${BASE_URL}/api/v1/basepacks`;

// Get token from command line or use default
const token = process.argv[2] || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAwN2RlNzRhLWVmYzktNDYwNi05MWE5LTBiZWY0OWI1YTQ2NCIsInJvbGUiOiJjdXN0b21lciIsInVzZXJOYW1lIjoiMTIzNDU2Nzg5MCIsImlhdCI6MTcxMzA1NDMyNX0.wYwY15UnD5x-mfG_KCA1Qve-1BUeNDtvM8EuzYRUnFA';

// Test with Bearer prefix
async function testWithBearer() {
    try {
        // Use Bearer prefix for auth
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        const payload = {
            basePackId: 'BS0005',
            type: 'DAILY',
            startDate: new Date().toISOString(),
            days: 7
        };

        console.log('Testing with Bearer token:', {
            url: `${API_URL}/subscribe`,
            headers: { ...headers, Authorization: 'Bearer TOKEN_EXISTS' },
            payload
        });

        const response = await fetch(`${API_URL}/subscribe`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        console.log('Raw response text:', responseText);

        try {
            const responseData = JSON.parse(responseText);
            console.log('Response status:', response.status);
            console.log('Response data:', responseData);
        } catch (e) {
            console.log('Response is not valid JSON');
        }
    } catch (error) {
        console.error('Bearer test error:', error);
    }
}

// Test without Bearer prefix
async function testWithoutBearer() {
    try {
        // No Bearer prefix
        const headers = {
            'Authorization': token,
            'Content-Type': 'application/json'
        };

        const payload = {
            basePackId: 'BS0005',
            type: 'DAILY',
            startDate: new Date().toISOString(),
            days: 7
        };

        console.log('Testing without Bearer token:', {
            url: `${API_URL}/subscribe`,
            headers: { ...headers, Authorization: 'TOKEN_EXISTS' },
            payload
        });

        const response = await fetch(`${API_URL}/subscribe`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        console.log('Raw response text:', responseText);

        try {
            const responseData = JSON.parse(responseText);
            console.log('Response status:', response.status);
            console.log('Response data:', responseData);
        } catch (e) {
            console.log('Response is not valid JSON');
        }
    } catch (error) {
        console.error('No Bearer test error:', error);
    }
}

// Get a brand new token by checking localStorage
async function testWithLocalStorage() {
    try {
        // Read actual token from localStorage
        console.log('Checking if localStorage is accessible...');
        // This won't work in Node.js environments, just a check
        if (typeof localStorage !== 'undefined') {
            const storedToken = localStorage.getItem('token');
            console.log('Token from localStorage:', storedToken ? 'Found token' : 'No token found');
        } else {
            console.log('localStorage not available in this environment');
        }
    } catch (error) {
        console.error('localStorage test error:', error);
    }
}

// Run all tests
console.log('=== RUNNING TESTS ===');
console.log('\n--- TEST WITH BEARER ---');
await testWithBearer();
console.log('\n--- TEST WITHOUT BEARER ---');
await testWithoutBearer(); 