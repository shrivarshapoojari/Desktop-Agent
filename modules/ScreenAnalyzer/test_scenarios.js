/**
 * Test Specific User Scenarios
 * Testing the actual use cases mentioned
 */

import { ScreenAnalyzer } from './ScreenAnalyzer.js';

async function testUserScenarios() {
  console.log('🧪 Testing Real User Scenarios\n');
  
  const analyzer = new ScreenAnalyzer();
  
  // Test 1: "What's on my screen?"
  console.log('📱 Test 1: "What\'s on my screen?"');
  try {
    const result1 = await analyzer.analyzeScreen("What's on my screen?");
    console.log('✅ Screen description generated');
    // Find VisionAgent result in workflow results
    const visionResult = result1.results?.find(r => r.agent === 'VisionAgent')?.result;
    const description = visionResult?.analysis?.description;
    console.log(`   Result: ${description ? description.substring(0, 100) + '...' : 'No description available'}`);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n');
  
  // Test 2: "Extract text from this image"
  console.log('📝 Test 2: "Extract text from this image"');
  try {
    const result2 = await analyzer.analyzeScreen("Extract all text from this screen");
    console.log('✅ Text extraction completed');
    // Find VisionAgent result in workflow results
    const visionResult = result2.results?.find(r => r.agent === 'VisionAgent')?.result;
    const extractedText = visionResult?.analysis?.description || visionResult?.extractedText;
    console.log(`   Text length: ${extractedText?.length || 0} characters`);
    if (extractedText && extractedText.length > 0) {
      console.log(`   Sample: ${extractedText.substring(0, 100)}...`);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n');
  
  // Test 3: "Find all clickable elements"
  console.log('🎯 Test 3: "Find all clickable elements"');
  try {
    const result3 = await analyzer.analyzeScreen("Find all clickable elements on this screen");
    console.log('✅ Element detection completed');
    // Find VisionAgent result in workflow results
    const visionResult = result3.results?.find(r => r.agent === 'VisionAgent')?.result;
    const elements = visionResult?.analysis?.elements || visionResult?.elements || [];
    console.log(`   Elements found: ${elements.length}`);
    if (elements.length > 0) {
      console.log('   Sample elements:');
      elements.slice(0, 3).forEach((elem, i) => {
        console.log(`     ${i+1}. ${elem.type || 'element'}: "${elem.text || elem.description}" at (${elem.x || 'unknown'}, ${elem.y || 'unknown'})`);
      });
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n');
  
  // Test 4: "Click the blue button" (this will show what's missing)
  console.log('🔵 Test 4: "Click the blue button"');
  try {
    const result4 = await analyzer.analyzeScreen("Click the blue button");
    console.log('✅ Action planning completed');
    console.log(`   Workflow: ${result4.workflow}`);
    console.log(`   Status: ${result4.success ? 'success' : 'needs additional agents'}`);
    // Find VisionAgent result in workflow results
    const visionResult = result4.results?.find(r => r.agent === 'VisionAgent')?.result;
    if (visionResult?.analysis?.description) {
      console.log(`   Vision analysis: ${visionResult.analysis.description.substring(0, 100)}...`);
    } else {
      console.log('⚠️  No action execution capability yet (needs ExecutionAgent)');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n');
  
  // Test 5: "Fill out this form" (this will show what's missing)
  console.log('📋 Test 5: "Fill out this form"');
  try {
    const result5 = await analyzer.analyzeScreen("Fill out this form with sample data");
    console.log('✅ Form analysis completed');
    console.log(`   Workflow: ${result5.workflow}`);
    console.log(`   Status: ${result5.success ? 'success' : 'needs additional agents'}`);
    // Find VisionAgent result in workflow results
    const visionResult = result5.results?.find(r => r.agent === 'VisionAgent')?.result;
    if (visionResult?.analysis?.elements) {
      const formElements = visionResult.analysis.elements.filter(el => 
        el.type === 'input' || el.type === 'form' || el.text?.includes('input')
      );
      console.log(`   Form fields detected: ${formElements.length}`);
    } else {
      console.log('⚠️  No form filling capability yet (needs ExecutionAgent)');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  await analyzer.cleanup();
  console.log('\n🏁 User scenario testing completed!');
}

// Run the tests
testUserScenarios().catch(console.error);
