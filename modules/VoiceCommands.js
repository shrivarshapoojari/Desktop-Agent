/**
 * Voice Command Module
 * Handles speech recognition and voice-to-text conversion
 */

class VoiceCommandSystem {
  constructor() {
    this.isListening = false;
    this.recognition = null;
    this.isSupported = false;
  }

  /**
   * Initialize voice recognition
   */
  initialize() {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      this.isSupported = true;

      this.recognition.onresult = (event) => {
        const command = event.results[0][0].transcript;
        console.log('🎤 Voice command:', command);
        this.onVoiceCommand(command);
      };

      this.recognition.onerror = (event) => {
        console.error('Voice recognition error:', event.error);
        this.isListening = false;
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };
    }
  }

  /**
   * Start listening for voice commands
   */
  startListening() {
    if (this.isSupported && !this.isListening) {
      this.isListening = true;
      this.recognition.start();
      return true;
    }
    return false;
  }

  /**
   * Stop listening for voice commands
   */
  stopListening() {
    if (this.isSupported && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Handle voice command (override this)
   * @param {string} command - Recognized voice command
   */
  onVoiceCommand(command) {
    // This will be connected to the main agent
    console.log('Voice command received:', command);
  }

  /**
   * Get voice command status
   */
  getStatus() {
    return {
      isSupported: this.isSupported,
      isListening: this.isListening
    };
  }
}

// Export singleton
export const voiceCommandSystem = new VoiceCommandSystem();
