class APIFeatures {
  // The constructor receives two arguments:
  // 1. query: the initial MongoDB query (e.g., Product.find()).
  // 2. queryString: the query string from the URL (e.g., req.query).
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  // 1. Filter the query based on the query parameters (basic and advanced filtering)
  filter() {
    // Create a deep copy of the query string (to avoid mutating the original)
    const queryObj = { ...this.queryString };

    // Define the fields to exclude from filtering, as these are related to pagination, sorting, etc.
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    
    // Remove excluded fields from queryObj
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering for query operators (e.g., gte, gt, lte, lt)
    // We need to add a `$` prefix to these operators to use them with MongoDB
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    // Use the filtered query string to search in the database
    this.query = this.query.find(JSON.parse(queryStr));

    // Return the current object for chaining methods
    return this;
  }

  // 2. Sort the query results based on the sort parameter
  sort() {
    // Check if a sort parameter is provided in the query string
    if (this.queryString.sort) {
      // Replace commas in the sort parameter with spaces to follow MongoDB's syntax
      const sortBy = this.queryString.sort.split(',').join(' ');

      // Apply sorting to the query
      this.query = this.query.sort(sortBy);
    } else {
      // Default sorting: if no sort parameter is provided, sort by createdAt in descending order
      this.query = this.query.sort('-createdAt');
    }

    // Return the current object for chaining methods
    return this;
  }

  // 3. Limit the fields returned in the query result (field limiting)
  limitFields() {
    // Check if the fields parameter is provided (e.g., fields=name,price)
    if (this.queryString.fields) {
      // Replace commas with spaces to follow MongoDB's syntax
      const fields = this.queryString.fields.split(',').join(' ');

      // Apply field selection to the query
      this.query = this.query.select(fields);
    } else {
      // Default behavior: if no fields parameter is provided, exclude the `__v` field
      this.query = this.query.select('-__v');
    }

    // Return the current object for chaining methods
    return this;
  }

  // 4. Implement pagination based on page and limit parameters
  paginate() {
    // Get the page number from the query string, default to 1 if not provided
    const page = this.queryString.page * 1 || 1;

    // Get the limit of documents per page, default to 100 if not provided
    const limit = this.queryString.limit * 1 || 100;

    // Calculate how many documents to skip (based on page and limit)
    const skip = (page - 1) * limit;

    // Apply skip and limit to the query for pagination
    this.query = this.query.skip(skip).limit(limit);

    // Return the current object for chaining methods
    return this;
  }
}

module.exports = APIFeatures;
