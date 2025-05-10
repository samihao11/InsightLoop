//brings in items from modules into scope
use reqwest::{Client, multipart::Form};
use std::path::Path;
use std::fs;
use std::fmt;
use std::error::Error;

#[derive(Debug)]
pub enum TranscriptionError {
    IoError(std::io::Error),
    ReqwestError(reqwest::Error),
}

impl fmt::Display for TranscriptionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TranscriptionError::IoError(e) => write!(f, "IO error: {}", e),
            TranscriptionError::ReqwestError(e) => write!(f, "Request error: {}", e),
        }
    }
}

impl Error for TranscriptionError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            TranscriptionError::IoError(e) => Some(e),
            TranscriptionError::ReqwestError(e) => Some(e),
        }
    }
}

impl From<std::io::Error> for TranscriptionError {
    fn from(err: std::io::Error) -> Self {
        TranscriptionError::IoError(err)
    }
}

impl From<reqwest::Error> for TranscriptionError {
    fn from(err: reqwest::Error) -> Self {
        TranscriptionError::ReqwestError(err)
    }
}

//takes in a file path and api key and returns a string or an error
//transcribes audio to text using openai api
pub async fn transcribe_audio(file_path: &Path, api_key: &str) -> Result<String, TranscriptionError> {
    println!("Reading file from: {:?}", file_path);
    let client = Client::new();
    let file_bytes = fs::read(file_path)?;
    println!("Read {} bytes from file", file_bytes.len());
    
    // Get the filename from the path
    let filename = file_path.file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("audio.m4a");
    
    let form = Form::new()
        .part("file", reqwest::multipart::Part::bytes(file_bytes)
            .file_name(filename.to_string()))
        .text("model", "whisper-1");

    println!("Sending request to OpenAI API...");
    let res = client.post("https://api.openai.com/v1/audio/transcriptions")
        .bearer_auth(api_key)
        .multipart(form)
        .send()
        .await?;
    
    println!("Response status: {}", res.status());
    let json = res.json::<serde_json::Value>().await?;
    println!("Response body: {:?}", json);

    let text = json["text"].as_str().unwrap_or_default().to_string();
    println!("Extracted text: {}", text);
    
    Ok(text)
}
