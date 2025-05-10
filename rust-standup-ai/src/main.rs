//modules
mod audio;
mod transcription;
mod summarizer;
mod storage;
mod report;
mod models;

use std::path::Path;
use rust_standup_ai::AudioProcessor;
use std::error::Error;
use dotenv::dotenv;
use std::env;

//this is to make the main function async with tokio
#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Load environment variables
    dotenv().ok();
    
    let api_key = env::var("OPENAI_API_KEY")
        .expect("OPENAI_API_KEY must be set");
    
    // For this example, we'll just print the transcript and not post to an API
    let api_endpoint = "http://localhost:8080/transcripts".to_string();  // Change this to your actual API endpoint

    let mut processor = AudioProcessor::new(api_endpoint, api_key);

    println!("Press Enter to start recording...");
    let mut input = String::new();
    std::io::stdin().read_line(&mut input)?;

    println!("Recording started! Press Enter to stop recording...");
    processor.start_recording().await?;
    
    std::io::stdin().read_line(&mut input)?;
    
    println!("Processing recording...");
    match processor.stop_and_process().await {
        Ok(transcript) => println!("Transcript: {}", transcript),
        Err(e) => {
            if e.to_string().contains("too short") {
                println!("Recording was too short! Please record for at least 0.1 seconds.");
            } else {
                println!("Error: {}", e);
            }
        }
    }

    Ok(())
}