import React, {useState, useCallback, useEffect} from 'react';
import {
    Box,
    Grid,
    GridItem,
    Heading,
    Text,
    VStack,
    HStack,
    Card,
    CardBody,
    CardHeader,
    useToast,
    Divider,
    Badge,
} from '@chakra-ui/react';
import FileUpload from '../components/FileUpload';
import UrlInput from '../components/UrlInput';
import ProcessingStatus from '../components/ProcessingStatus';
import ResultsDisplay from '../components/ResultsDisplay';
import {useQuery} from 'react-query';
import {apiClient} from '../api/client';

interface Task {
    task_id: string;
    status: string;
    progress?: number;
    message: string;
    result?: any;
}

const STORAGE_KEY = 'vegseg_completed_tasks';
const SESSION_KEY = 'vegseg_session_initialized';

const HomePage: React.FC = () => {
    const [currentTask, setCurrentTask] = useState<string | null>(null);
    const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
    const toast = useToast();

    // Always reset results on page refresh/load
    useEffect(() => {
        // Clear any saved tasks on every page load
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        setCompletedTasks([]);

        // Optional: Show a message that results were cleared
        console.log('Results cleared on page refresh');
    }, []);

    // Poll task status when there's an active task
    const {data: taskStatus} = useQuery(
        ['taskStatus', currentTask],
        () => apiClient.getTaskStatus(currentTask!),
        {
            enabled: !!currentTask,
            refetchInterval: (data) => {
                // Stop polling if task is completed or errored
                if (data?.status === 'completed' || data?.status === 'error') {
                    return false;
                }
                return 2000; // Poll every 2 seconds
            },
            onSuccess: (data) => {
                if (data.status === 'completed') {
                    setCompletedTasks((prev) => {
                        // Check if task already exists
                        const exists = prev.some(t => t.task_id === data.task_id);
                        if (exists) {
                            return prev;
                        }
                        // Add new task and keep last 5
                        return [data, ...prev.slice(0, 4)];
                    });
                    setCurrentTask(null);
                    toast({
                        title: 'Segmentation Completed!',
                        description: `Vegetation percentage: ${data.result?.vegetation_percentage}%`,
                        status: 'success',
                        duration: 5000,
                        isClosable: true,
                    });
                } else if (data.status === 'error') {
                    setCurrentTask(null);
                    toast({
                        title: 'Processing Error',
                        description: data.message,
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                    });
                }
            },
        }
    );

    const handleTaskStart = useCallback((taskId: string) => {
        setCurrentTask(taskId);
    }, []);

    const handleDeleteTask = useCallback((taskId: string) => {
        setCompletedTasks((prev) => prev.filter((task) => task.task_id !== taskId));
    }, []);

    return (
        <Box>
            {/* Header */}
            <VStack spacing={6} textAlign="center" mb={12}>
                <Heading size="2xl" color="vegetation.600">
                    Vegetation Segmentation
                </Heading>
                <Text fontSize="xl" color="gray.600" maxW="2xl">
                    Upload aerial images or satellite imagery to automatically detect and segment vegetation areas using
                    advanced deep learning models.
                </Text>
                <HStack spacing={4}>
                    <Badge colorScheme="green" px={3} py={1} borderRadius="full">
                        TIFF/GeoTIFF Support
                    </Badge>
                    <Badge colorScheme="blue" px={3} py={1} borderRadius="full">
                        Real-time Processing
                    </Badge>
                    <Badge colorScheme="purple" px={3} py={1} borderRadius="full">
                        API Available
                    </Badge>
                </HStack>
            </VStack>

            <Grid templateColumns={{base: '1fr', lg: '1fr 1fr'}} gap={8}>
                {/* Upload Section */}
                <GridItem>
                    <VStack spacing={6}>
                        <Card w="full">
                            <CardHeader>
                                <Heading size="lg">Upload Image</Heading>
                                <Text color="gray.600">
                                    Supports JPEG, PNG, TIFF, and GeoTIFF formats up to 50MB
                                </Text>
                            </CardHeader>
                            <CardBody>
                                <FileUpload onTaskStart={handleTaskStart} disabled={!!currentTask}/>
                            </CardBody>
                        </Card>

                        <Divider/>

                        <Card w="full">
                            <CardHeader>
                                <Heading size="lg">Process from URL</Heading>
                                <Text color="gray.600">
                                    Enter a direct link to an image file
                                </Text>
                            </CardHeader>
                            <CardBody>
                                <UrlInput onTaskStart={handleTaskStart} disabled={!!currentTask}/>
                            </CardBody>
                        </Card>
                    </VStack>
                </GridItem>

                {/* Results Section */}
                <GridItem>
                    <VStack spacing={6}>
                        {/* Current Processing */}
                        {currentTask && taskStatus && (
                            <Card w="full">
                                <CardHeader>
                                    <Heading size="lg">Processing Status</Heading>
                                </CardHeader>
                                <CardBody>
                                    <ProcessingStatus task={taskStatus}/>
                                </CardBody>
                            </Card>
                        )}

                        {/* Recent Results */}
                        {completedTasks.length > 0 && (
                            <Card w="full">
                                <CardHeader>
                                    <Heading size="lg">Recent Results</Heading>
                                    <Text color="gray.600">
                                        Latest segmentation results (cleared on refresh)
                                    </Text>
                                </CardHeader>
                                <CardBody>
                                    <VStack spacing={4}>
                                        {completedTasks.map((task) => (
                                            <ResultsDisplay
                                                key={task.task_id}
                                                task={task}
                                                onDelete={() => handleDeleteTask(task.task_id)}
                                            />
                                        ))}
                                    </VStack>
                                </CardBody>
                            </Card>
                        )}

                        {/* Welcome Message */}
                        {!currentTask && completedTasks.length === 0 && (
                            <Card w="full">
                                <CardBody textAlign="center" py={12}>
                                    <VStack spacing={4}>
                                        <Text fontSize="lg" color="gray.500">
                                            🌿 Welcome to VegSeg
                                        </Text>
                                        <Text color="gray.400">
                                            Upload an image or enter a URL to get started with vegetation segmentation
                                        </Text>
                                    </VStack>
                                </CardBody>
                            </Card>
                        )}
                    </VStack>
                </GridItem>
            </Grid>
        </Box>
    );
};

export default HomePage;
