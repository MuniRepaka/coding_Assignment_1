const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const { format } = require("date-fns");

const app = express();
app.use(express.json());

var isValid = require("date-fns/isValid");

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//API Query Checking
const checkPriorityValues = (value) => {
  const isPossibleValues = ["HIGH", "MEDIUM", "LOW"];
  return isPossibleValues.includes(value);
};

const checkStatusValues = (value) => {
  const isPossibleValues = ["TO DO", "IN PROGRESS", "DONE"];
  return isPossibleValues.includes(value);
};

const checkCategoryValues = (value) => {
  const isPossibleValues = ["WORK", "HOME", "LEARNING"];
  return isPossibleValues.includes(value);
};

const checkDateFormat = (value) => {
  const result = isValid(new Date(value));
  return result;
};

//Invalid Cases for API
const checkingInvalidCases = (request, response, next) => {
  const type = request.method;
  let queryValues = [];
  if (type === "GET") {
    const { category, priority, status, due_date, search_q } = request.query;
    searchQuery = search_q;
    queryValues = [category, priority, status, due_date];
  } else {
    const { category, priority, status, dueDate } = request.body;
    queryValues = [category, priority, status, dueDate];
  }

  let result = true;
  let invalidMessage = "";
  for (let num in queryValues) {
    if (queryValues[num] !== undefined) {
      if (num === "0") {
        result = checkCategoryValues(queryValues[num]);
        invalidMessage = "Invalid Todo Category";
      }
      if (num === "1") {
        result = checkPriorityValues(queryValues[num]);
        invalidMessage = "Invalid Todo Priority";
      }
      if (num === "2") {
        result = checkStatusValues(queryValues[num]);
        invalidMessage = "Invalid Todo Status";
      }
      if (num === "3") {
        result = checkDateFormat(queryValues[num]);
        invalidMessage = "Invalid Due Date";
      }
      if (result === false) {
        response.status(400);
        response.send(invalidMessage);
        break;
      }
    }
  }
  if (result === true) {
    next();
  }
};

//API 1
app.get("/todos/", checkingInvalidCases, async (request, response) => {
  const { category, priority, status, due_date, search_q } = request.query;
  let getTodoQuery = "";
  //Scenario 3
  if (priority !== undefined && status !== undefined) {
    getTodoQuery = `
        SELECT
        id,todo,priority,status,category,due_date AS dueDate
        FROM
        todo
        WHERE
        priority = '${priority}' AND status = '${status}';`;
  }

  //Scenario 5
  else if (category !== undefined && status !== undefined) {
    getTodoQuery = `
            SELECT
            id,todo,priority,status,category,due_date AS dueDate
            FROM
            todo
            WHERE
            category = '${category}' AND status = '${status}';`;
  }
  //Scenario 7
  else if (category !== undefined && priority !== undefined) {
    getTodoQuery = `
              SELECT
              id,todo,priority,status,category,due_date AS dueDate
              FROM
              todo
              WHERE
              category = '${category}' AND priority = '${priority}';`;
  }
  //Scenario 1
  else if (status !== undefined) {
    getTodoQuery = `
      SELECT
      id,todo,priority,status,category,due_date AS dueDate
      FROM
      todo
      WHERE
      status = '${status}';`;
  }
  //Scenario 2
  else if (priority !== undefined) {
    getTodoQuery = `
      SELECT
      id,todo,priority,status,category,due_date AS dueDate
      FROM
      todo
      WHERE
      priority = '${priority}';`;
  }
  //Scenario 4
  else if (search_q !== undefined) {
    getTodoQuery = `
      SELECT
      id,todo,priority,status,category,due_date AS dueDate
      FROM
      todo
      WHERE
      todo LIKE '%${search_q}%';
      `;
  }
  //Scenario 6
  else if (category !== undefined) {
    getTodoQuery = `
      SELECT
      id,todo,priority,status,category,due_date AS dueDate
      FROM
      todo
      WHERE
      category = '${category}';
      `;
  }
  const todoArray = await db.all(getTodoQuery);
  response.send(todoArray);
});

//API 2

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getSingleTodoQuery = `
    SELECT
    id,todo,priority,status,category,due_date AS dueDate
    FROM
    todo
    WHERE
    id = ${todoId};
    `;
  const todoItem = await db.get(getSingleTodoQuery);
  response.send(todoItem);
});

//API 3

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (checkDateFormat(date)) {
    const newDate = format(new Date(date), "yyyy-MM-dd");
    const getAgendaQuery = `
  SELECT
    id,todo,priority,status,category,due_date AS dueDate
    FROM
    todo
    WHERE
    due_date='${newDate}';
  `;
    const todoIdAgendaQuery = await db.all(getAgendaQuery);
    response.send(todoIdAgendaQuery);
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//API 4

app.post("/todos/", checkingInvalidCases, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const createTodoQuery = `
    INSERT INTO
    todo(id,todo,priority,status,category,due_date)
    VALUES
    (
        ${id},
        '${todo}',
        '${priority}',
        '${status}',
        '${category}',
        '${dueDate}'
    );`;
  await db.run(createTodoQuery);
  response.send("Todo Successfully Added");
});

//API 5
app.put("/todos/:todoId/", checkingInvalidCases, async (request, response) => {
  const { todoId } = request.params;
  const { status, priority, todo, category, dueDate } = request.body;
  let responseMessage = "";
  let updateTodoQuery;
  if (status !== undefined) {
    updateTodoQuery = `
        UPDATE
        todo
        SET
        status = '${status}'
        WHERE
        id = ${todoId};
        `;
    responseMessage = "Status Updated";
  } else if (priority !== undefined) {
    updateTodoQuery = `
        UPDATE
        todo
        SET
        priority = '${priority}'
        WHERE
        id = ${todoId};
        `;
    responseMessage = "Priority Updated";
  } else if (todo !== undefined) {
    updateTodoQuery = `
        UPDATE
        todo
        SET
        todo = '${todo}'
        WHERE
        id = ${todoId};
        `;
    responseMessage = "Todo Updated";
  } else if (category !== undefined) {
    updateTodoQuery = `
        UPDATE
        todo
        SET
        category = '${category}'
        WHERE
        id = ${todoId};
        `;
    responseMessage = "Category Updated";
  } else if (dueDate !== undefined) {
    updateTodoQuery = `
        UPDATE
        todo
        SET
        due_date = '${dueDate}'
        WHERE
        id = ${todoId};
        `;
    responseMessage = "Due Date Updated";
  }
  await db.run(updateTodoQuery);
  response.send(responseMessage);
});

//API 6
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    DELETE FROM
    todo
    WHERE
    id = ${todoId};
    `;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
