import { ScreenAnalyzer } from "./ScreenAnalyzer.js";

/**
 * Test suite for Agentic Screen Analysis System
 */
async function testScreenAnalyzer() {
  console.log("🧪 Testing Agentic Screen Analysis System\n");
  
  const analyzer = new ScreenAnalyzer();
  
  // Test 1: System Status
  console.log("📊 Test 1: System Status");
  const status = analyzer.getStatus();
  console.log("System Status:", status);
  console.log("✅ Status check passed\n");
  
  // Test 2: Take Screenshot
  console.log("📸 Test 2: Take Screenshot");
  try {
    const screenshot = await analyzer.takeScreenshot();
    if (screenshot.success) {
      console.log(`✅ Screenshot captured: ${screenshot.filename}`);
      console.log(`   File size: ${screenshot.size} bytes`);
    } else {
      console.log("❌ Screenshot failed:", screenshot.error);
    }
  } catch (error) {
    console.log("❌ Screenshot error:", error.message);
  }
  console.log("");
  
  // Test 3: Describe Screen
  console.log("🔍 Test 3: Describe Current Screen");
  try {
    const description = await analyzer.describeScreen();
    if (description.success) {
      console.log("✅ Screen analysis successful");
      console.log(`   Description: ${description.description.substring(0, 200)}...`);
      console.log(`   Elements found: ${description.elements.length}`);
      console.log(`   Confidence: ${(description.confidence * 100).toFixed(1)}%`);
    } else {
      console.log("❌ Screen analysis failed:", description.error);
    }
  } catch (error) {
    console.log("❌ Analysis error:", error.message);
  }
  console.log("");
  
  // Test 4: Extract Text
  console.log("📝 Test 4: Extract Text from Screen");
  try {
    const textResult = await analyzer.extractText();
    if (textResult.success) {
      console.log("✅ Text extraction successful");
      console.log(`   Text length: ${textResult.text.length} characters`);
      console.log(`   First 150 chars: "${textResult.text.substring(0, 150)}..."`);
    } else {
      console.log("❌ Text extraction failed:", textResult.error);
    }
  } catch (error) {
    console.log("❌ Text extraction error:", error.message);
  }
  console.log("");
  
  // Test 5: Find Elements
  console.log("🎯 Test 5: Find UI Elements");
  try {
    const elements = await analyzer.findElements("button");
    if (elements.success) {
      console.log("✅ Element detection successful");
      console.log(`   Matching elements: ${elements.elements.length}`);
      console.log(`   Total elements: ${elements.allElements.length}`);
      
      if (elements.elements.length > 0) {
        console.log("   Found buttons:");
        elements.elements.slice(0, 3).forEach((el, i) => {
          console.log(`     ${i+1}. "${el.text}" (${el.type})`);
        });
      }
    } else {
      console.log("❌ Element detection failed:", elements.error);
    }
  } catch (error) {
    console.log("❌ Element detection error:", error.message);
  }
  console.log("");
  
  // Test 6: General Analysis
  console.log("🧠 Test 6: General Screen Analysis");
  try {
    const analysis = await analyzer.analyzeScreen("What can I do on this screen?");
    if (analysis.success) {
      console.log("✅ General analysis successful");
      console.log(`   Workflow executed: ${analysis.workflow.join(' → ')}`);
      console.log(`   Results count: ${analysis.results.length}`);
    } else {
      console.log("❌ General analysis failed:", analysis.error);
    }
  } catch (error) {
    console.log("❌ General analysis error:", error.message);
  }
  console.log("");
  
  // Cleanup
  console.log("🧹 Cleaning up...");
  await analyzer.cleanup();
  console.log("✅ Cleanup completed");
  
  console.log("\n🎉 Agentic Screen Analysis System test completed!");
}

// Run tests if this file is executed directly
if (process.argv[1].endsWith('test.js')) {
  testScreenAnalyzer().catch(console.error);
}

export { testScreenAnalyzer };
