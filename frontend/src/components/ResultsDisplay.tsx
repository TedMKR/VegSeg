import React, {useState} from 'react';
import {
    VStack,
    HStack,
    Text,
    Image,
    Button,
    Box,
    Grid,
    GridItem,
    Badge,
    Stat,
    StatLabel,
    StatNumber,
    StatGroup,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
    IconButton,
    Tooltip,
    useToast,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
} from '@chakra-ui/react';
import {FaExpand, FaDownload, FaTrash} from 'react-icons/fa';
import {apiClient, TaskStatus} from '../api/client';

interface ResultsDisplayProps {
    task: TaskStatus;
    onDelete?: () => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({task, onDelete}) => {
    const {isOpen, onOpen, onClose} = useDisclosure();
    const {isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose} = useDisclosure();
    const [selectedImage, setSelectedImage] = useState<string>('');
    const [selectedTitle, setSelectedTitle] = useState<string>('');
    const [isDeleting, setIsDeleting] = useState(false);
    const cancelRef = React.useRef<HTMLButtonElement>(null);
    const toast = useToast();

    if (!task.result) {
        return null;
    }

    const {result} = task;

    const openImageModal = (imageUrl: string, title: string) => {
        setSelectedImage(imageUrl);
        setSelectedTitle(title);
        onOpen();
    };

    const downloadImage = async (url: string, filename: string) => {
        try {
            // Fetch the image as blob
            const imageUrl = apiClient.getResultUrl(url.split('/').pop() || '');
            const response = await fetch(imageUrl);
            const blob = await response.blob();

            // Create a download link
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;

            // Trigger download
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            toast({
                title: 'Download started',
                description: `Downloading ${filename}`,
                status: 'success',
                duration: 2000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: 'Download failed',
                description: 'Could not download the image',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await apiClient.deleteTask(task.task_id);
            toast({
                title: 'Result deleted',
                description: 'Segmentation result has been removed',
                status: 'success',
                duration: 2000,
                isClosable: true,
            });
            onDeleteClose();
            if (onDelete) {
                onDelete();
            }
        } catch (error) {
            toast({
                title: 'Delete failed',
                description: 'Could not delete the result',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <Box w="full" p={4} border="1px" borderColor="gray.200" borderRadius="md" position="relative">
                {/* Delete Button */}
                <Tooltip label="Delete result" placement="left">
                    <IconButton
                        position="absolute"
                        top="2"
                        right="2"
                        size="md"
                        icon={<FaTrash/>}
                        aria-label="Delete result"
                        onClick={onDeleteOpen}
                        colorScheme="red"
                        variant="solid"
                        zIndex={10}
                        minW="40px"
                        minH="40px"
                        _hover={{
                            bg: 'red.600',
                            transform: 'scale(1.1)',
                        }}
                    />
                </Tooltip>

                <VStack spacing={4}>
                    {/* Stats */}
                    <StatGroup w="full">
                        <Stat textAlign="center">
                            <StatLabel>Vegetation Coverage</StatLabel>
                            <StatNumber color="vegetation.500">
                                {result.vegetation_percentage}%
                            </StatNumber>
                        </Stat>
                        <Stat textAlign="center">
                            <StatLabel>Processing Time</StatLabel>
                            <StatNumber color="blue.500">
                                {result.processing_time}s
                            </StatNumber>
                        </Stat>
                        {result.method && (
                            <Stat textAlign="center">
                                <StatLabel>Method</StatLabel>
                                <StatNumber color="purple.500" fontSize="md">
                                    {result.method}
                                </StatNumber>
                            </Stat>
                        )}
                    </StatGroup>

                    {/* Show unique classes if available */}
                    {result.unique_classes && result.unique_classes.length > 0 && (
                        <HStack w="full" justify="center" spacing={2} flexWrap="wrap">
                            <Text fontSize="sm" fontWeight="medium" color="gray.600">
                                Classes found:
                            </Text>
                            {result.unique_classes.map((classId: number) => (
                                <Badge
                                    key={classId}
                                    colorScheme={classId === 0 ? 'gray' : 'green'}
                                    variant="solid"
                                >
                                    Class {classId}
                                </Badge>
                            ))}
                        </HStack>
                    )}

                    {/* Images */}
                    <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4} w="full">
                        <GridItem>
                            <VStack spacing={2}>
                                <Text fontSize="sm" fontWeight="medium" color="gray.600">
                                    Binary Mask
                                </Text>
                                <Box position="relative" borderRadius="md" overflow="hidden" w="full">
                                    <Image
                                        src={apiClient.getResultUrl(result.result_mask_url.split('/').pop() || '')}
                                        alt="Vegetation mask"
                                        w="full"
                                        h="200px"
                                        objectFit="cover"
                                        bg="gray.100"
                                    />
                                    <HStack
                                        position="absolute"
                                        top="2"
                                        right="2"
                                        spacing={2}
                                    >
                                        <Tooltip label="View fullsize" placement="left">
                                            <IconButton
                                                size="sm"
                                                icon={<FaExpand/>}
                                                aria-label="View fullsize"
                                                onClick={() => openImageModal(
                                                    apiClient.getResultUrl(result.result_mask_url.split('/').pop() || ''),
                                                    'Binary Mask'
                                                )}
                                                colorScheme="vegetation"
                                                bg="white"
                                                color="vegetation.600"
                                                _hover={{
                                                    bg: 'vegetation.500',
                                                    color: 'white',
                                                    transform: 'scale(1.1)',
                                                }}
                                                shadow="md"
                                                transition="all 0.2s"
                                            />
                                        </Tooltip>
                                        <Tooltip label="Download" placement="left">
                                            <IconButton
                                                size="sm"
                                                icon={<FaDownload/>}
                                                aria-label="Download"
                                                onClick={() => downloadImage(
                                                    result.result_mask_url,
                                                    `vegetation_mask_${task.task_id.split('-')[0]}.png`
                                                )}
                                                colorScheme="blue"
                                                bg="white"
                                                color="blue.600"
                                                _hover={{
                                                    bg: 'blue.500',
                                                    color: 'white',
                                                    transform: 'scale(1.1)',
                                                }}
                                                shadow="md"
                                                transition="all 0.2s"
                                            />
                                        </Tooltip>
                                    </HStack>
                                </Box>
                            </VStack>
                        </GridItem>

                        <GridItem>
                            <VStack spacing={2}>
                                <Text fontSize="sm" fontWeight="medium" color="gray.600">
                                    Overlay
                                </Text>
                                <Box position="relative" borderRadius="md" overflow="hidden" w="full">
                                    <Image
                                        src={apiClient.getResultUrl(result.overlay_url.split('/').pop() || '')}
                                        alt="Vegetation overlay"
                                        w="full"
                                        h="200px"
                                        objectFit="cover"
                                        bg="gray.100"
                                    />
                                    <HStack
                                        position="absolute"
                                        top="2"
                                        right="2"
                                        spacing={2}
                                    >
                                        <Tooltip label="View fullsize" placement="left">
                                            <IconButton
                                                size="sm"
                                                icon={<FaExpand/>}
                                                aria-label="View fullsize"
                                                onClick={() => openImageModal(
                                                    apiClient.getResultUrl(result.overlay_url.split('/').pop() || ''),
                                                    'Vegetation Overlay'
                                                )}
                                                colorScheme="vegetation"
                                                bg="white"
                                                color="vegetation.600"
                                                _hover={{
                                                    bg: 'vegetation.500',
                                                    color: 'white',
                                                    transform: 'scale(1.1)',
                                                }}
                                                shadow="md"
                                                transition="all 0.2s"
                                            />
                                        </Tooltip>
                                        <Tooltip label="Download" placement="left">
                                            <IconButton
                                                size="sm"
                                                icon={<FaDownload/>}
                                                aria-label="Download"
                                                onClick={() => downloadImage(
                                                    result.overlay_url,
                                                    `vegetation_overlay_${task.task_id.split('-')[0]}.png`
                                                )}
                                                colorScheme="blue"
                                                bg="white"
                                                color="blue.600"
                                                _hover={{
                                                    bg: 'blue.500',
                                                    color: 'white',
                                                    transform: 'scale(1.1)',
                                                }}
                                                shadow="md"
                                                transition="all 0.2s"
                                            />
                                        </Tooltip>
                                    </HStack>
                                </Box>
                            </VStack>
                        </GridItem>

                        {/* Multi-class Segmentation (if available) */}
                        {result.segmentation_url && (
                            <GridItem>
                                <VStack spacing={2}>
                                    <Text fontSize="sm" fontWeight="medium" color="gray.600">
                                        7-Class Segmentation
                                    </Text>
                                    <Box position="relative" borderRadius="md" overflow="hidden" w="full">
                                        <Image
                                            src={apiClient.getResultUrl(result.segmentation_url.split('/').pop() || '')}
                                            alt="Multi-class segmentation"
                                            w="full"
                                            h="200px"
                                            objectFit="cover"
                                            bg="gray.100"
                                        />
                                        <HStack
                                            position="absolute"
                                            top="2"
                                            right="2"
                                            spacing={2}
                                        >
                                            <Tooltip label="View fullsize" placement="left">
                                                <IconButton
                                                    size="sm"
                                                    icon={<FaExpand/>}
                                                    aria-label="View fullsize"
                                                    onClick={() => {
                                                        if (result.segmentation_url) {
                                                            openImageModal(
                                                                apiClient.getResultUrl(result.segmentation_url.split('/').pop() || ''),
                                                                'Multi-class Segmentation'
                                                            );
                                                        }
                                                    }}
                                                    colorScheme="vegetation"
                                                    bg="white"
                                                    color="vegetation.600"
                                                    _hover={{
                                                        bg: 'vegetation.500',
                                                        color: 'white',
                                                        transform: 'scale(1.1)',
                                                    }}
                                                    shadow="md"
                                                    transition="all 0.2s"
                                                />
                                            </Tooltip>
                                            <Tooltip label="Download" placement="left">
                                                <IconButton
                                                    size="sm"
                                                    icon={<FaDownload/>}
                                                    aria-label="Download"
                                                    onClick={() => {
                                                        if (result.segmentation_url) {
                                                            downloadImage(
                                                                result.segmentation_url,
                                                                `segmentation_${task.task_id.split('-')[0]}.png`
                                                            );
                                                        }
                                                    }}
                                                    colorScheme="blue"
                                                    bg="white"
                                                    color="blue.600"
                                                    _hover={{
                                                        bg: 'blue.500',
                                                        color: 'white',
                                                        transform: 'scale(1.1)',
                                                    }}
                                                    shadow="md"
                                                    transition="all 0.2s"
                                                />
                                            </Tooltip>
                                        </HStack>
                                    </Box>
                                </VStack>
                            </GridItem>
                        )}
                    </Grid>

                    {/* Image Dimensions */}
                    <HStack w="full" justify="center" spacing={4}>
                        <Badge variant="outline">
                            {result.image_dimensions[1]} × {result.image_dimensions[0]} px
                        </Badge>
                        <Badge colorScheme="vegetation" variant="subtle">
                            Task: {task.task_id.split('-')[0]}
                        </Badge>
                    </HStack>
                </VStack>
            </Box>

            {/* Image Modal */}
            <Modal isOpen={isOpen} onClose={onClose} size="6xl">
                <ModalOverlay/>
                <ModalContent>
                    <ModalHeader>{selectedTitle}</ModalHeader>
                    <ModalCloseButton/>
                    <ModalBody pb={6}>
                        <Image
                            src={selectedImage}
                            alt={selectedTitle}
                            w="full"
                            maxH="80vh"
                            objectFit="contain"
                        />
                    </ModalBody>
                </ModalContent>
            </Modal>

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                isOpen={isDeleteOpen}
                leastDestructiveRef={cancelRef}
                onClose={onDeleteClose}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Delete Result
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            Are you sure you want to delete this segmentation result? This action cannot be undone.
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={onDeleteClose}>
                                Cancel
                            </Button>
                            <Button
                                colorScheme="red"
                                onClick={handleDelete}
                                ml={3}
                                isLoading={isDeleting}
                                loadingText="Deleting..."
                            >
                                Delete
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </>
    );
};

export default ResultsDisplay;