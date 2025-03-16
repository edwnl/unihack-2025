use clap::Parser;
use reqwest::Client;
use serde_json::json;
use std::{collections::HashMap, error::Error};

///
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct BackendResponse {
    timestamp: String,
    status: u16,
    error: String,
    trace: String,
}

/// Simple CLI tool
#[derive(Parser, Debug)]
#[command(name = "rust-nfc")]
#[command(version = "1.0")]
#[command(about = "Rust nfc component for a card website")]
struct Args {
    #[arg(long, value_name = "Base URL of the website")]
    base: String,

    #[arg(long, value_name = "Game ID")]
    game: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let args = Args::parse();

    // Serial port configuration
    let port_name = "/dev/ttyUSB0";
    let baud_rate = 115200; // Adjust this based on your device
    let mut cards: HashMap<&str, &str> = HashMap::new();
    cards.insert("4628F22E1791", "45");
    cards.insert("4B132FA2E1790", "28");
    cards.insert("49915F22E1790", "24");
    cards.insert("4633CFA2E1790", "21");
    cards.insert("41027F22E1791", "31");
    cards.insert("4C131F22E1790", "19");
    cards.insert("47025F22E1790", "4A");
    cards.insert("4594AF22E1790", "3A");
    cards.insert("4B1EF22E1790", "4D");
    cards.insert("4201DFA2E1791", "23");
    cards.insert("4C28F22E1791", "37");
    cards.insert("43B48F22E1790", "4B");
    cards.insert("4A3EFA2E1791", "42");
    cards.insert("4E42BF22E1790", "11");
    cards.insert("4231DF22E1791", "38");
    cards.insert("4AA34FA2E1790", "17");
    cards.insert("48317F22E1790", "1B");
    cards.insert("46226F22E1790", "3C");
    cards.insert("4A38FA2E1791", "43");
    cards.insert("433DFA2E1791", "22");
    cards.insert("44148F22E1790", "2C");
    cards.insert("4171DFA2E1791", "13");
    cards.insert("4F123F22E1790", "41");
    cards.insert("4C937F22E1790", "35");
    cards.insert("45B38F22E1790", "29");
    cards.insert("45A2EF22E1790", "18");
    cards.insert("48E20F22E1790", "46");
    cards.insert("43F3DF22E1791", "3D");
    cards.insert("4A935FA2E1790", "12");
    cards.insert("48745F22E1790", "26");
    cards.insert("41D1DF22E1791", "44");
    cards.insert("4BF32F22E1790", "15");
    cards.insert("49045F22E1790", "27");
    cards.insert("4EF28F22E1790", "47");
    cards.insert("4CD17F22E1790", "32");
    cards.insert("48628F22E1790", "33");
    cards.insert("44239F22E1790", "2A");
    cards.insert("4B01FF22E1790", "34");
    cards.insert("4201DF22E1791", "49");
    cards.insert("4A318F22E1790", "48");
    cards.insert("45C32FA2E1790", "16");
    cards.insert("4153DFA2E1791", "25");
    cards.insert("46D32FA2E1790", "14");
    cards.insert("42B22F22E1791", "2B");
    cards.insert("4B4AF22E1790", "3B");
    cards.insert("48145F22E1790", "1A");
    cards.insert("46F1FF22E1790", "36");
    cards.insert("48816F22E1790", "2D");
    cards.insert("44C4AF22E1790", "1C");
    cards.insert("4162FF22E1791", "1D");
    cards.insert("4494AF22E1790", "4C");
    cards.insert("4FE28F22E1790", "39");

    let post_url = format!("{}/api/scanner/{}/scan", args.base, args.game);
    println!("Using game -> {}", post_url);
    println!("Attempting to open serial port: {}", port_name);
    let mut port = match serialport::new(port_name, baud_rate)
        .timeout(std::time::Duration::from_millis(100))
        .open()
    {
        Ok(port) => port,
        Err(e) => {
            eprintln!("Failed to open serial port: {}", e);
            return Err(e.into());
        }
    };

    println!("Serial port opened successfully. Baud rate: {}", baud_rate);

    // Create a reqwest client for making HTTP requests
    let client = Client::new();
    let mut last_card_json = json!({
        "suit": "UNKNOWN",
        "rank": "UNKNOWN"
    });

    // Spawn serial reading task
    tokio::spawn(async move {
        let mut buffer = [0u8; 1024];
        loop {
            match port.read(&mut buffer) {
                Ok(bytes) => {
                    if bytes > 0 {
                        let data = String::from_utf8_lossy(&buffer[..bytes]).to_string();
                        //println!(
                        //    "Serial data ({} bytes) ({} long): {:?}",
                        //    data.len(),
                        //    bytes,
                        //    data
                        //);
                        if data.len() == 14 || data.len() == 15 {
                            if let Some(uid) = data.get(..(data.len() - 2)) {
                                if let Some(card_data) = cards.get(uid) {
                                    let card_type = card_data.chars().nth(0);
                                    let card_number = card_data.chars().nth(1);
                                    let rank = match card_number.unwrap() {
                                        '1' => "ACE",
                                        '2' => "TWO",
                                        '3' => "THREE",
                                        '4' => "FOUR",
                                        '5' => "FIVE",
                                        '6' => "SIX",
                                        '7' => "SEVEN",
                                        '8' => "EIGHT",
                                        '9' => "NINE",
                                        'A' => "TEN",
                                        'B' => "JACK",
                                        'C' => "QUEEN",
                                        'D' => "KING",
                                        _ => "UNKNOWN",
                                    }
                                    .to_string();
                                    let suit = match card_type.unwrap() {
                                        '1' => "CLUBS",
                                        '2' => "SPADES",
                                        '3' => "DIAMONDS",
                                        '4' => "HEARTS",
                                        _ => "UNKNOWN",
                                    }
                                    .to_string();
                                    if suit != "UNKNOWN" && rank != "UNKNOWN" {
                                        let card_json = json!({
                                            "suit": suit,
                                            "rank": rank
                                        });
                                        if last_card_json != card_json {
                                            // Send the scanned card data as a POST request to the REST API
                                            println!("Sending {} {} {}", suit, rank, card_data);
                                            match client
                                                .post(&post_url.to_string())
                                                .json(&serde_json::json!(card_json))
                                                .send()
                                                .await
                                            {
                                                Ok(res) => {
                                                    if res.status() == 200 {
                                                        println!("Sent successfully");
                                                    } else if res.status() == 400 {
                                                        match res.text().await.ok() {
                                                            Some(text) => println!("{}", text),
                                                            _ => {}
                                                        }
                                                    } else if res.status() == 404 {
                                                        println!("Invalid URL");
                                                    };
                                                    //match res.json::<BackendResponse>().await {
                                                    //    Ok(r) => match r.status {
                                                    //        404 => {
                                                    //            println!("Game does not exist")
                                                    //        }
                                                    //        _ => {
                                                    //            print!(
                                                    //                "Unknown status {:?}",
                                                    //                r.status
                                                    //            )
                                                    //        }
                                                    //    },
                                                    //    Err(e) => {
                                                    //        eprintln!(
                                                    //            "Error decoding json: {}",
                                                    //            e
                                                    //        )
                                                    //    }
                                                    //}
                                                }
                                                Err(e) => {
                                                    eprintln!("Error sending POST request: {}", e)
                                                }
                                            }
                                            last_card_json = card_json;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    // Ignore timeout errors, log others, and continue the loop
                    if e.kind() != std::io::ErrorKind::TimedOut {
                        eprintln!("Serial read error: {}", e);
                    }
                    // Wait before trying again to prevent tight looping
                    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                }
            }
        }
    });

    // The main thread should keep running, do nothing here
    loop {
        tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
    }
}
