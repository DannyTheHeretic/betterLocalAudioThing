import { DeskThing } from '@deskthing/server';
import { existsSync, mkdirSync, writeFile, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
import { fileExtension, imagesDir } from "./settings"


const pipelineAsync = promisify(pipeline);

export const saveImage = async (imageData: string, fileName: string): Promise<string | undefined> => {
    // Check if it's a URL
    if (imageData.startsWith('http://') || imageData.startsWith('https://') || imageData.startsWith('file://')) {
        console.log('Processing image URL');
        return await downloadImage(imageData, fileName); 
    }
    // Handle base64 data
    else if (imageData.startsWith('data:image')) {
        console.log('Processing base64 image data');
        return await saveBase64Image(imageData, fileName);
    } 
    // Handle binary data
    else {
        console.log('Processing binary image data');
        return await saveBinaryImage(imageData, fileName);
    }
}


const downloadImage = async (url: string, fileName: string): Promise<string | undefined> => {
    try {
        // Handle local files
        if (url.startsWith('file://')) {
            return await handleLocalFile(url, fileName, imagesDir);
        }

        // Download from url
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to fetch image: ${response.status} ${response.statusText}`); 
            return;
        }

        
        const filePath = join(imagesDir, `${fileName}.${fileExtension}`);
        
        // Get the response as a stream and save it
        if (response.body) {
            const fileStream = createWriteStream(filePath);
            await pipelineAsync(response.body as any, fileStream);
            
            console.log(`Successfully downloaded image: ${fileName}.${fileExtension}`);
            return `/resource/image/better-local-audio/${fileName}.${fileExtension}`;
        } else {
            console.error('No response body received');
            return;
        }
        
    } catch (error) {
        console.error(`Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
    }
}


const handleLocalFile = async (fileUrl: string, fileName: string, imagesDir: string): Promise<string | undefined> => {
    try {
        // Convert file:// URL to local path
        const localPath = fileUrl.replace('file://', '');
        
        // Check if local file exists
        if (!existsSync(localPath)) {
            console.error(`Local file does not exist: ${localPath}`);
            return;
        }

        // Always save as PNG for compatibility
        const targetPath = join(imagesDir, `${fileName}.${fileExtension}`);
        
        // Read the local file and copy it
        const fs = await import('node:fs/promises');
        await fs.copyFile(localPath, targetPath);
        
        console.log(`Successfully copied local file: ${fileName}.${fileExtension}`);
        return `/resource/image/better-local-audio/${fileName}.${fileExtension}`;
        
    } catch (error) {
        console.error(`Failed to handle local file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
    }
}



const saveBase64Image = async (base64Image: string, fileName: string): Promise<string | undefined> => {
    // Extract the image format from the data URL
    const matches = base64Image.match(/^data:image\/([a-zA-Z+]+);base64,/);
    if (!matches) {
        console.error('Invalid base64 image format');
        return;
    }
    
    // Always save as PNG for compatibility
    const base64Data = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    
    // Generate file path with correct extension
    const filePath = join(imagesDir, `${fileName}.${fileExtension}`);
    
    // Write the file and return a promise
    return new Promise((resolve, reject) => {
        writeFile(filePath, base64Data, 'base64', (err) => {
            if (err) {
                console.error(`Failed to save base64 image: ${err.message}`);
                reject(err);
                return;
            }
            console.log(`Successfully saved base64 image: ${fileName}.${fileExtension}`);
            resolve(`/resource/image/better-local-audio/${fileName}.${fileExtension}`);
        });
    });
}

const saveBinaryImage = async (binaryData: string, fileName: string): Promise<string | undefined> => {
    // Create the images directory if it doesn't exist
    
    // Generate file path 
    const filePath = join(imagesDir, `${fileName}.${fileExtension}`);
    
    // Write the file and return a promise
    return new Promise((resolve, reject) => {
        writeFile(filePath, binaryData, 'binary', (err) => {
            if (err) {
                console.error(`Failed to save binary image: ${err.message}`);
                reject(err);
                return;
            }
            console.log(`Successfully saved binary image: ${fileName}.${fileExtension}`);
            resolve(`/resource/image/better-local-audio/${fileName}.${fileExtension}`);
        });
    });
}

export async function deleteImages() {
    const imagesDir = join(__dirname, '../images')

    if (existsSync(imagesDir)) {
        const files = readdirSync(imagesDir)
        for (const file of files) {
            unlinkSync(join(imagesDir, file))
        }
    }
}