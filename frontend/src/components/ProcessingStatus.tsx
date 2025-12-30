import React from 'react';
import {
    VStack,
    HStack,
    Text,
    Progress,
    Badge,
    Icon,
    Spinner,
    Box,
} from '@chakra-ui/react';
import {FaCheckCircle, FaTimesCircle, FaClock, FaDownload, FaCog} from 'react-icons/fa';
import {TaskStatus} from '../api/client';

interface ProcessingStatusProps {
    task: TaskStatus;
}

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({task}) => {
    const getStatusIcon = () => {
        switch (task.status) {
            case 'completed':
                return <Icon as={FaCheckCircle} color="green.500"/>;
            case 'error':
                return <Icon as={FaTimesCircle} color="red.500"/>;
            case 'downloading':
                return <Icon as={FaDownload} color="blue.500"/>;
            case 'processing':
                return <Icon as={FaCog} color="vegetation.500"/>;
            default:
                return <Icon as={FaClock} color="yellow.500"/>;
        }
    };

    const getStatusColor = () => {
        switch (task.status) {
            case 'completed':
                return 'green';
            case 'error':
                return 'red';
            case 'downloading':
                return 'blue';
            case 'processing':
                return 'vegetation';
            default:
                return 'yellow';
        }
    };

    const getProgressColor = () => {
        switch (task.status) {
            case 'downloading':
                return 'blue';
            case 'processing':
                return 'green';
            case 'completed':
                return 'green';
            default:
                return 'yellow';
        }
    };

    return (
        <VStack spacing={4} w="full">
            {/* Status Header */}
            <HStack w="full" justify="space-between">
                <HStack spacing={2}>
                    {task.status === 'processing' ? (
                        <Spinner size="sm" color="vegetation.500"/>
                    ) : (
                        getStatusIcon()
                    )}
                    <Text fontWeight="medium" textTransform="capitalize">
                        {task.status}
                    </Text>
                </HStack>
                <Badge colorScheme={getStatusColor()} variant="subtle">
                    {task.status}
                </Badge>
            </HStack>

            {/* Progress Bar */}
            {task.progress !== undefined && (
                <Box w="full">
                    <HStack justify="space-between" mb={2}>
                        <Text fontSize="sm" color="gray.600">
                            Progress
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                            {task.progress}%
                        </Text>
                    </HStack>
                    <Progress
                        value={task.progress}
                        size="lg"
                        colorScheme={getProgressColor()}
                        hasStripe
                        isAnimated={task.status !== 'completed' && task.status !== 'error'}
                        borderRadius="md"
                    />
                </Box>
            )}

            {/* Status Message */}
            <Box w="full">
                <Text fontSize="sm" color="gray.600" textAlign="center">
                    {task.message}
                </Text>
            </Box>

            {/* Task ID */}
            <Box w="full" pt={2} borderTop="1px" borderColor="gray.200">
                <Text fontSize="xs" color="gray.400" textAlign="center">
                    Task ID: {task.task_id}
                </Text>
            </Box>
        </VStack>
    );
};

export default ProcessingStatus;