import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ GEMINI_API_KEY is missing");
  process.exit(1);
}

async function testRestApi() {
  console.log("🔍 Testing Gemini REST API...");

  const models = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-pro"
  ];

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
    
    try {
      console.log(`\n👉 Testing URL: https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
      
      const response = await axios.post(url, {
        contents: [{
          parts: [{ text: "Hello" }]
        }]
      });

      console.log(`✅ ${model} SUCCESS! Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data.candidates?.[0]?.content?.parts?.[0]?.text)}`);
      
      // Found a working one!
      console.log(`\n🎉 WORKING MODEL FOUND: "${model}"`);
      return; 

    } catch (error) {
      if (error.response) {
        console.log(`❌ ${model} Failed: ${error.response.status} ${error.response.statusText}`);
        // console.log(JSON.stringify(error.response.data, null, 2));
      } else {
        console.log(`❌ ${model} Error: ${error.message}`);
      }
    }
  }

  console.log("\n❌ ALL REST API ATTEMPTS FAILED. Check your API Key or Google Cloud Project status.");
}

testRestApi();
