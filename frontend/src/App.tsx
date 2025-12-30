import React from 'react';
import {ChakraProvider, Box, Container} from '@chakra-ui/react';
import {QueryClient, QueryClientProvider} from 'react-query';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import theme from './theme';

// Create a client for React Query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes
        },
    },
});

function App() {
    return (
        <ChakraProvider theme={theme}>
            <QueryClientProvider client={queryClient}>
                <Box minHeight="100vh" bg="gray.50">
                    <Header/>
                    <Container maxW="container.xl" py={8}>
                        <HomePage/>
                    </Container>
                </Box>
            </QueryClientProvider>
        </ChakraProvider>
    );
}

export default App;