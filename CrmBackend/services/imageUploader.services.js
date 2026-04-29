const {S3}=require("aws-sdk");
const { Upload } = require("@aws-sdk/lib-storage");
const { S3Client,PutObjectCommand,DeleteObjectCommand,GetObjectCommand  } = require('@aws-sdk/client-s3');
const s3Client=require('../config/aws3bucket')
const uuid=require("uuid").v4;
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();
 


exports.s3Uploadv2 = async (file) => {
  try {
    // Validate if the file object is provided
    if (!file || !file.originalname || !file.buffer || !file.mimetype) {
      throw new Error("Invalid file. Ensure the file has originalname, buffer, and mimetype.");
    }

    // Sanitize file name and prepare the upload parameters
    const fileName = `Okaupload/${uuidv4()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`; // Sanitize file name
    const params = {
      Bucket: process.env.AWS_REGION_S3_BUCKET, // Replace with your S3 bucket name
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };
   
    // // Upload the file to S3
    // await s3Client.send(new PutObjectCommand(params));

    // // Generate the public URL for the uploaded file
    // const url = `https://${process.env.AWS_REGION_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    // // Return metadata about the uploaded file
    // return { url, key: fileName, originalName: file.originalname };
     // Use the Upload utility for dynamic chunking
     const upload = new Upload({
      client: s3Client, // S3 client instance
      queueSize: 5, // Concurrency for parallel uploads
      params, // Upload parameters
    });

    // Start the upload and wait for completion
    await upload.done();

    // Generate the public URL for the uploaded file
    const url = `https://${process.env.AWS_REGION_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    // Return metadata about the uploaded file
    return { url, key: fileName, originalName: file.originalname };
  } catch (error) {
    console.error("Error uploading file to S3:", error.message);
    throw new Error("File upload failed");
  }
};

//for v3 version
exports.s3Uploadv4=async(files)=> {

  //multiple file upload
  const params=files.map(file =>{
    return {
      Bucket: process.env.AWS_REGION_S3_BUCKET,
      Key:`upload/${uuid()}-${file.originalname}`,
      Body: file.buffer,
      ContentType: file.mimetype,
    };
  });
  return await Promise.all(
    params.map(param=> s3Client.send(new PutObjectCommand(param)))
  );
   
}
 
exports.s3Uploadv3 = async (files) => {
  try {
    // Map through files and prepare S3 upload parameters
    const uploadPromises = files.map((file) => {
      const fileName = `upload/${uuidv4()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`; // Sanitize file name
     const params = {
        Bucket: process.env.AWS_REGION_S3_BUCKET, // Replace with your S3 bucket name
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      // Upload file to S3
      return s3Client.send(new PutObjectCommand(params)).then(() => {
        // Generate public URL for the uploaded file
        const url = `https://${process.env.AWS_REGION_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
        return { url, key: fileName, originalName: file.originalname };
      });
    });

    // Wait for all files to be uploaded
    const uploadedFiles = await Promise.all(uploadPromises);

    // Return an array of uploaded file metadata (URLs, keys, etc.)
    return uploadedFiles;
  } catch (error) {
    console.error("Error uploading files to S3:", error);
    throw new Error("File upload failed");
  }
};

//uploading display picture and stored into s3bucket and mongodb storage
exports.putObject = async(file,fileName) =>{
  try{
      const params = {
          Bucket: process.env.AWS_REGION_S3_BUCKET,
          Key: `${fileName}`,
          Body: file.buffer,
          ContentType: file.mimetype,
      }

       
      const data = await s3Client.send(new PutObjectCommand(params));

      if(data.$metadata.httpStatusCode !== 200){
          return;
      }
      let url = `https://${process.env.AWS_REGION_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`
      console.log(url);
      return {url,key:params.Key};
  }catch(err){
      console.error(err);
  }
}
exports.getObject = async(key) =>{
  try{
      const params = {
          Bucket:process.env.AWS_REGION_S3_BUCKET,
          Key:key
      }
      // const command = new GetObjectCommand(params);
      const data = await s3Client.send( new GetObjectCommand(params));
      console.log(data);
      
  }catch(err){
      console.error(err);
  }
}
exports.deleteObject = async(key) =>{
  try{
      const params = {
          Bucket: process.env.AWS_REGION_S3_BUCKET,
          Key:key
      }
     
      const data = await s3Client.send(new DeleteObjectCommand(params));

      if(data.$metadata.httpStatusCode !== 204){
          return {status:400,data}
      }
      return {status:204};
  }catch(err){
      console.error(err);
  }
}

 
