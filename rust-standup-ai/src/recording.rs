use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::SampleFormat;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use hound::{WavSpec, WavWriter};

pub struct AudioRecorder {
    samples: Arc<Mutex<Vec<f32>>>,
    is_recording: Arc<Mutex<bool>>,
    stream: Option<Arc<Mutex<Box<dyn StreamTrait>>>>,
    sample_rate: Arc<Mutex<u32>>,
}

impl AudioRecorder {
    pub fn new() -> Self {
        AudioRecorder {
            samples: Arc::new(Mutex::new(Vec::new())),
            is_recording: Arc::new(Mutex::new(false)),
            stream: None,
            sample_rate: Arc::new(Mutex::new(44100)),
        }
    }

    pub fn start_recording(&mut self) -> Result<(), String> {
        let host = cpal::default_host();
        let device = host.default_input_device()
            .ok_or("No input device available")?;

        println!("Using input device: {}", device.name().map_err(|e| e.to_string())?);

        let config = device.default_input_config()
            .map_err(|e| e.to_string())?;

        println!("Default input config: {:?}", config);
        
        // Store the actual sample rate
        *self.sample_rate.lock().unwrap() = config.sample_rate().0;

        let samples = Arc::clone(&self.samples);
        let is_recording = Arc::clone(&self.is_recording);
        *is_recording.lock().unwrap() = true;

        let err_fn = move |err| {
            eprintln!("An error occurred on the input audio stream: {}", err);
        };

        let stream = match config.sample_format() {
            SampleFormat::F32 => device.build_input_stream(
                &config.into(),
                move |data: &[f32], _: &_| {
                    if *is_recording.lock().unwrap() {
                        samples.lock().unwrap().extend_from_slice(data);
                    }
                },
                err_fn,
                None
            ),
            sample_format => {
                return Err(format!("Unsupported sample format: {:?}", sample_format));
            }
        }.map_err(|e| e.to_string())?;

        stream.play().map_err(|e| e.to_string())?;
        
        // Store the stream so it's not dropped
        self.stream = Some(Arc::new(Mutex::new(Box::new(stream))));

        Ok(())
    }

    pub fn stop_recording(&mut self) -> Result<PathBuf, String> {
        *self.is_recording.lock().unwrap() = false;

        let samples = self.samples.lock().unwrap().clone();
        self.samples.lock().unwrap().clear();

        // Check if we have enough audio data (at least 0.1 seconds)
        let sample_rate = *self.sample_rate.lock().unwrap();
        let min_samples = (sample_rate as f32 * 0.1) as usize;
        if samples.len() < min_samples {
            return Err("Recording too short. Please record for at least 0.1 seconds.".to_string());
        }

        // Create a temporary WAV file
        let temp_path = std::env::temp_dir().join("recording.wav");
        let spec = WavSpec {
            channels: 1,
            sample_rate,
            bits_per_sample: 32,
            sample_format: hound::SampleFormat::Float,
        };

        let mut writer = WavWriter::create(&temp_path, spec)
            .map_err(|e| e.to_string())?;

        for &sample in &samples {
            writer.write_sample(sample)
                .map_err(|e| e.to_string())?;
        }

        writer.finalize().map_err(|e| e.to_string())?;
        
        // Drop the stream to clean up resources
        self.stream = None;
        
        Ok(temp_path)
    }
} 