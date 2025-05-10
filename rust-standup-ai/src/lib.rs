pub mod recording;
pub mod transcription;

use std::path::Path;
use reqwest::Client;
use serde_json::json;

pub struct AudioProcessor {
    recorder: recording::AudioRecorder,
    api_endpoint: String,
    api_key: String,
}

impl AudioProcessor {
    pub fn new(api_endpoint: String, api_key: String) -> Self {
        AudioProcessor {
            recorder: recording::AudioRecorder::new(),
            api_endpoint,
            api_key,
        }
    }

    pub async fn start_recording(&mut self) -> Result<(), String> {
        self.recorder.start_recording()
    }

    pub async fn stop_and_process(&mut self) -> Result<String, Box<dyn std::error::Error>> {
        // Stop recording and get the file path
        let recording_path = self.recorder.stop_recording()?;
        
        // Transcribe the audio
        let transcript = transcription::transcribe_audio(
            Path::new(&recording_path), 
            &self.api_key
        ).await?;

        // Post to API
        let client = Client::new();
        let response = client.post(&self.api_endpoint)
            .bearer_auth(&self.api_key)
            .json(&json!({
                "transcript": transcript
            }))
            .send()
            .await?;

        // Clean up the temporary file
        std::fs::remove_file(recording_path)?;

        if response.status().is_success() {
            Ok(transcript)
        } else {
            Err(format!("API request failed: {}", response.status()).into())
        }
    }
} 