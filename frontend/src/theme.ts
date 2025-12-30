import {extendTheme} from '@chakra-ui/react';

const theme = extendTheme({
    colors: {
        vegetation: {
            50: '#f0fff4',
            100: '#c6f6d5',
            200: '#9ae6b4',
            300: '#68d391',
            400: '#48bb78',
            500: '#38a169',
            600: '#2f855a',
            700: '#276749',
            800: '#22543d',
            900: '#1a202c',
        },
        brand: {
            50: '#e3f2fd',
            100: '#bbdefb',
            200: '#90caf9',
            300: '#64b5f6',
            400: '#42a5f5',
            500: '#2196f3',
            600: '#1e88e5',
            700: '#1976d2',
            800: '#1565c0',
            900: '#0d47a1',
        }
    },
    components: {
        Button: {
            defaultProps: {
                colorScheme: 'vegetation',
            },
            variants: {
                solid: {
                    bg: 'vegetation.500',
                    color: 'white',
                    _hover: {
                        bg: 'vegetation.600',
                        transform: 'translateY(-2px)',
                        shadow: 'lg',
                    },
                    _active: {
                        bg: 'vegetation.700',
                        transform: 'translateY(0)',
                    },
                    transition: 'all 0.2s',
                },
                outline: {
                    borderColor: 'vegetation.500',
                    color: 'vegetation.500',
                    _hover: {
                        bg: 'vegetation.50',
                        transform: 'translateY(-1px)',
                    },
                },
            },
        },
        Input: {
            variants: {
                filled: {
                    field: {
                        bg: 'white',
                        _hover: {
                            bg: 'white',
                        },
                        _focus: {
                            bg: 'white',
                            borderColor: 'vegetation.500',
                        },
                    },
                },
            },
        },
        Card: {
            baseStyle: {
                container: {
                    bg: 'white',
                    shadow: 'xl',
                    borderRadius: 'xl',
                    overflow: 'hidden',
                    transition: 'all 0.3s',
                    _hover: {
                        transform: 'translateY(-4px)',
                        shadow: '2xl',
                    },
                },
            },
        },
    },
    fonts: {
        heading: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`,
        body: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`,
    },
    styles: {
        global: {
            body: {
                bg: 'gray.50',
                color: 'gray.800',
            },
        },
    },
});

export default theme;