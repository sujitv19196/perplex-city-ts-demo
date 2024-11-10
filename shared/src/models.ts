export interface User {
  id: number;
  name: string;
  email: string;
}

// TODO - use the interface across BE and FE 
// Enforce this interface in API route for req and res
export interface Message {
  sender: 'user' | 'bot';
  text: string;
  citations?: string[];
  relatedQuestions?: string[];
};
