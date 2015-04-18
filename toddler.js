// toddler.js
// Query language DSL for Javascript

var mori = require("mori");

var toddler = {

    _query: function(query) {
        return query || mori.hashMap();
    },

    operation: function(query, op) {
        return mori.assoc(this._query(query), ":operation", op);
    },

    select: function(query, what) {
        query = this.operation(query, ":select");
        return mori.assoc(query, ":columns", what);
    },

    from: function(query, table) {
        return mori.assoc(this._query(query),
                          ":from", table);
    },

    where: function(query, clause) {
        return mori.assoc(this._query(query),
                          ":where", clause);
    },

    limit: function(query, limit) {
        return mori.assoc(this._query(query),
                          ":limit", limit);
    },

    offset: function(query, offset) {
        return mori.assoc(this._query(query),
                          ":offset", offset);
    },

    orderBy: function(query, columns) {
        var query = this._query(query);
        if (!mori.isSequential(mori.toClj(columns))) {
            columns = mori.vector(columns);
        }
        var existingOrderings = mori.get(query, ":order") || mori.vector();
        return mori.assoc(query, ":order", mori.concat(existingOrderings, columns));
    },

    // simple clauses; store them like a LISP exp
    clause: function(type, a, b) {
        return mori.vector(type, a, b);
    },

    eq: function(a, b) { return this.clause("=", a, b)  },
    ne: function(a, b) { return this.clause("!=", a, b) },
    gt: function(a, b) { return this.clause(">", a, b)  },
    lt: function(a, b) { return this.clause("<", a, b)  },
    ge: function(a, b) { return this.clause(">=", a, b) },
    le: function(a, b) { return this.clause("<=", a, b) },

    // nodes in clauses
    and: function(clauses) {
        if (arguments.length > 1) {
            clauses = mori.vector.apply(mori, arguments);
        }
        return mori.hashMap(":type", ":and", ":sub", clauses);
    },
    or: function(clauses) {
        if (arguments.length > 1) {
            clauses = mori.vector.apply(mori, arguments);
        }
        return mori.hashMap(":type", ":or", ":sub", clauses);
    },
    not: function(clause) {
        return mori.hashMap(":type", ":not", ":sub", clause);
    },
};

function Query() {
    this._query = mori.hashMap();
}

Query.prototype.select = function(columns) {
    var what = mori.isSequential(mori.toClj(columns)) ? columns : mori.vector.apply(mori, arguments);
    this._query = toddler.select(this._query, what);
    return this;
};

Query.prototype.from = function(table) {
    this._query = toddler.from(this._query, table);
    return this;
};

Query.prototype.where = function(clause) {
    this._query = toddler.where(this._query, clause);
    return this;
};

Query.prototype.limit = function(limit) {
    this._query = toddler.limit(this._query, limit);
    return this;
};

Query.prototype.offset = function(offset) {
    this._query = toddler.offset(this._query, offset);
    return this;
};

Query.prototype.orderBy = function(orderings) {
    this._query = toddler.orderBy(this._query, orderings);
    return this;
};

Query.prototype.and = function(clause) {
    var existing = mori.get(this._query, ":where");
    this._query = toddler.where(this._query, toddler.and(existing, clause));
    return this;
};

Query.prototype.or = function(clause) {
    var existing = mori.get(this._query, ":where");
    this._query = toddler.where(this._query, toddler.or(existing, clause));
    return this;
};

Query.prototype.not = function() {
    var existing = mori.get(this._query, ":where");
    this._query = toddler.where(toddler.not(this._query, existing));
    return this;
};

Query.prototype.query = function() { return this._query };

toddler.Query = Query;


function Translator() {
}

// Later generalise this to other dialects
Translator.prototype.prepare = function(query) {
    var q = "";

    // operator
    if (mori.get(query, ":operation") === ":select") {
        q = q + "select ";
    }

    // columns
    var columns = mori.get(query, ":columns");
    if (columns === null) {
        columns = mori.vector("*");
    } else if (!mori.isVector(columns)) {
        columns = mori.vector(columns);
    }
    q = q + mori.toJs(columns).join(", ");

    // tables
    q = q + " from " + mori.get(query, ":from");

    var where = mori.get(query, ":where");
    var bind = mori.vector();
    if (where) {
        var clause = this.prepareClause(where);
        q = q + " where " + mori.get(clause, ":statement");
        bind = mori.get(clause, ":bind");
    }

    var limit = mori.get(query, ":limit");
    if (limit) {
        q = q + " limit " + limit;
    }

    return mori.hashMap(":statement", q, ":bind", bind);
}

Translator.prototype.OPERAND_MAP = mori.hashMap(
    ":and", "and",
    ":or", "or",
    ":not", "not"
);

Translator.prototype.prepareClause = function(clause) {
    if (mori.isMap(clause)) {
        var type = mori.get(clause, ":type");
        if (type === ":and" || type === ":or") {
            var clauses = mori.map(this.prepareClause, mori.get(clause, ":sub"));

            var statements = mori.map(mori.curry(mori.get, ":statement"), clauses);

            var binds = mori.map(mori.partial(mori.get, ":bind"), clauses);

            var statement = "(" + mori.toJs(statements).join(" " + mori.get(this.OPERAND_MAP, type) + " ") + ")";
            var bind = mori.reduce(mori.conj, mori.vector(), binds);
            return mori.hashMap(":statement", statement, ":bind", bind);
        } else {
            // NOT
            var notClause = this.prepareClause(mori.get(clause, ":sub"));
            var statement = mori.get(this.OPERAND_MAP, type) + " " + mori.get(notClause, ":statement");
            return mori.assoc(notClause, ":statement", statement);
        }
    } else if (mori.isSequential(clause)) {
        var statement = mori.get(clause, 1) + " " + mori.get(clause, 0) + " ";
        var binds = mori.vector();
        var right = mori.get(clause, 2);
        if (right === "?" || right === "%@") {
            mori.conj(binds, "?");
        }
        return mori.hashMap(":statement", statement + right, ":bind", binds);
    }
}

toddler.Translator = Translator;

module.exports = toddler;
