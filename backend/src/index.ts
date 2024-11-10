import express from 'express';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());
app.use(routes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});