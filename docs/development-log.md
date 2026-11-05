# Thrift+ — Development Log

## Milestone 0: Project Setup

**Status:** Completed

### Work completed
- Created the public GitHub repository.
- Set up the local development environment.
- Installed Node.js and verified the development tools.
- Prepared the repository for incremental development.

### Next tasks
- Document project requirements.
- Establish the initial folder structure.
- Initialize the React frontend.
- Build the first responsive homepage.

### Learning notes
Record the Git commands, setup issues and technical concepts learned during each milestone.

### Testing
Record only tests that have actually been run and their results.



## Milestone 1: Initial React Frontend

**Status:** Initial implementation completed; validation recorded.

### Features implemented
- Responsive Thrift+ homepage.
- Navigation and collection section.
- Sample clothing product cards.
- Category filtering.
- Product search.
- Product detail modal.
- Empty search-result state.
- Responsive styling for smaller screens.

### Manual Testing
- [x] Category filtering works.
- [x] Product search works.
- [x] Product detail modal opens.
- [x] Product detail modal closes correctly.
- [x] Mobile layout checked.
- [x] Sample product images load.

### Automated Validation
Record the actual results of `npm run lint` and `npm run build` here.

### Current Limitations
- Product data is currently stored in frontend JavaScript.
- No backend or database is connected yet.
- Authentication, checkout and real shipping are not implemented.
- Product images depend on external image URLs.

### Next Milestone
Create the Node.js and Express backend with a health-check API endpoint.


## Milestone 2: Initial Backend Setup

**Status:** Completed and manually tested.

### Technologies
- Node.js
- Express.js
- Nodemon

### Features implemented
- Created a separate backend application.
- Initialized the backend using npm.
- Installed Express.js and Nodemon.
- Created the server.js entry point.
- Implemented the welcome API route (`GET /`).
- Implemented the health-check API route (`GET /api/health`).

### API Testing
- [x] GET / — Returns the welcome message.
- [x] GET /api/health — Returns a successful health-check response.
- [x] Backend server starts successfully on port 5000.

### Current Limitations
- No database connected yet.
- No user authentication.
- No real product API.
- No connection between React and Express yet.

### Next Milestone
Build the product API and understand how the React frontend communicates with the backend.


## Milestone 3: Product API Development

**Status:** Completed and manually tested.

### Features implemented
- Created a separate product data file (`backend/data/products.js`).
- Added six sample clothing products.
- Created product routes (`backend/routes/productRoutes.js`).
- Connected product routes to the Express server.
- Implemented an API to retrieve all products.
- Implemented an API to retrieve an individual product by ID.
- Added a 404 response for products that do not exist.

### API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/products` | Retrieve all products |
| GET | `/api/products/:id` | Retrieve one product by ID |

### Testing Results
- [x] All six products returned successfully.
- [x] Individual product retrieved successfully.
- [x] Invalid product ID returned a 404 response.
- [x] All API endpoints tested manually in the browser.

### Current Limitations
- Product data is stored in a JavaScript array.
- Products are not stored in a permanent database.
- No product creation, editing or deletion API yet.
- React frontend is not connected to the backend product API yet.

### Next Milestone
Connect the React frontend to the Express backend using HTTP requests and the Fetch API.
