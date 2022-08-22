const express = require('express');
const { v4 } = require('uuid');

const app = express();
app.use(express.json());

const customers = [];

function verifyCustomerExists(req, res, next) {
  const { cpf } = req.headers;
  const customer = customers.find(c => c.cpf === cpf);

  if (!customer) {
    return res.status(400).json({ error: 'Customer not found' });
  }

  req.customer = customer;
  return next();
}

function getBalance(statement) {
  return statement.reduce((acc, cur) => {
    if (cur.type === 'deposit') {
      return acc + cur.amount;
    }

    return acc - cur.amount;
  }, 0);
}

app.post('/account', (req, res) => {
    const { name, email, cpf } = req.body;

    const customerAlreadyExists = customers.find(customer => customer.cpf === cpf);

    if (customerAlreadyExists) {
        return res.status(400).json({ error: 'Customer already exists' });
    }

    customers.push({
        id: v4(),
        name,
        cpf,
        email,
        statement: []
    });

    res.send(customers);
});

app.get('/statement/', verifyCustomerExists, (req, res) => {
    const { customer } = req
    
    return res.json(customer.statement);
});

app.get('/statement/date', verifyCustomerExists, (req, res) => {
    const { customer } = req
    const { date } = req.query

    const dateFormat = new Date(date + ' 00:00');

    const statement = customer.statement.filter(statement => 
        statement.created_at.toDateString() === new Date(dateFormat).toDateString()
    );
    
    
    return res.json(statement);
});

app.post('/deposit', verifyCustomerExists, (req, res) => {
    const { amount, description } = req.body;
    const { customer } = req;

    const operation = {
        id: v4(),
        type: 'deposit',
        amount,
        description,
        created_at: new Date()
    };

    customer.statement.push(operation);
    return res.status(201).send();
});

app.post('/withdraw', verifyCustomerExists, (req, res) => {
    const { amount } = req.body;
    const { customer } = req;

    const balance = getBalance(customer.statement) 
    
    balance < amount && res.status(400).json({ error: 'Insufficient balance' });
    
    const operation = {
        id: v4(),
        type: 'withdraw',
        amount,
        created_at: new Date()
    };

    customer.statement.push(operation);
    return res.status(201).send({balance: balance});
});

app.put('/account', verifyCustomerExists, (req, res) => {
    const { name, email } = req.body;
    const { customer } = req;

    customer.name = name;
    customer.email = email;

    return res.send(customer);
});

app.delete('/account', verifyCustomerExists, (req, res) => {
    const { customer } = req;

    customers.splice(customers.indexOf(customer), 1);

    return res.send(customer);
});

app.get('/balance', verifyCustomerExists, (req, res) => {
    const { customer } = req;

    const balance = getBalance(customer.statement);

    return res.json({ balance });
});

app.listen(3333);