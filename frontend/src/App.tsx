import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import { User } from 'shared/src/models';

type Message = { // TODO - move to shared models file
  sender: 'user' | 'bot';
  text: string;
  citations?: string[];
  relatedQuestions?: string[];
};

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false); // 🆕 Added loading state
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch('/api/users')
      .then((response) => response.json())
      .then((data: User[]) => setUsers(data))
      .catch((error) => console.error('Error fetching users:', error));
  }, []); // fetch on mount

  const handleSendQuery = async (query?: string) => {
    const actualQuery = query ?? searchQuery;
    if (!actualQuery.trim()) return;

    // Add user message
    const userMessage: Message = { sender: 'user', text: actualQuery };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    // Clear input if the query wasn't from a suggestion button
    if (!query) setSearchQuery('');

    setIsLoading(true); // 🆕 Set loading to true before fetch
    try {
      const response = await fetch(`/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: actualQuery }),
      });

      const data = await response.json();

      // Add bot response
      const botMessage: Message = {
        sender: 'bot',
        text: data.result,
        citations: data.citations,
        relatedQuestions: data.relatedQuestions,
      };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error('Error searching:', error);
      const errorMessage: Message = {
        sender: 'bot',
        text: 'Sorry, there was an error processing your request.',
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false); // 🆕 Set loading to false after fetch
    }
  };

  // Scroll to the bottom of the chat when new messages are added
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle Enter key press for sending messages
  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendQuery();
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Perplex-City</h1>
      </header>
      <div className="chat-container">
        <div className="chat-window">
          {/* Messages */}
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`chat-message ${msg.sender === 'user' ? 'user-message' : 'bot-message'}`}
            >
              {/* Message Text */}
              <div className="message-text">{msg.text}</div>

              {/* Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="citations">
                  <strong>Citations:</strong>
                  <ul>
                    {msg.citations.map((citation, idx) => (
                      <li key={idx}>
                        <a href={citation} target="_blank" rel="noopener noreferrer">
                          {citation}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
                
              {/* Related Questions */}
              {msg.relatedQuestions && msg.relatedQuestions.length > 0 && (
                <div className="related-questions">
                  <strong>Related Questions:</strong>
                  <div className="suggestion-buttons">
                    {msg.relatedQuestions.map((question, qIdx) => (
                      <button
                        key={qIdx}
                        onClick={() => handleSendQuery(question)}
                        className="suggestion-button"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <span>Loading...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
        <div className="input-area">
          <textarea
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Enter your query..."
            onKeyPress={handleKeyPress}
            disabled={isLoading} 
          />
          <button onClick={() => handleSendQuery()} disabled={isLoading}> 
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
