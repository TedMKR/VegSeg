import React from 'react';
import {
    Box,
    Flex,
    Heading,
    Spacer,
    Button,
    HStack,
    Icon,
    useColorModeValue,
    Container,
} from '@chakra-ui/react';
import {FaLeaf, FaExternalLinkAlt} from 'react-icons/fa';

const Header: React.FC = () => {
    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    const openSwaggerDocs = () => {
        window.open('http://localhost:8000/docs', '_blank');
    };

    return (
        <Box bg={bgColor} borderBottom="1px" borderColor={borderColor} shadow="sm">
            <Container maxW="container.xl">
                <Flex h="16" alignItems="center">
                    {/* Logo */}
                    <HStack spacing={2}>
                        <Icon as={FaLeaf} w={8} h={8} color="vegetation.500"/>
                        <Heading size="lg" color="vegetation.600">
                            VegSeg
                        </Heading>
                    </HStack>

                    <Spacer/>

                    {/* Navigation */}
                    <HStack spacing={4}>
                        <Button
                            onClick={openSwaggerDocs}
                            variant="ghost"
                            colorScheme="gray"
                            leftIcon={<FaExternalLinkAlt/>}
                            size="sm"
                        >
                            API
                        </Button>
                    </HStack>
                </Flex>
            </Container>
        </Box>
    );
};

export default Header;