import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
       return JSON.parse(storagedCart);
    }

    return [];
  });

  /* Alterar o valor do carrinho no localStorage toda vez que ele mudar (toda vez que for
    executado o comando setCart() na aplicação atravez do useRef()) */
    const prevCartRef = useRef<Product[]>(); //Criando referência
    //Esse useEfect vai rodar todas as vezes q isso renderizar novamente
    useEffect(() => {
      //Toda vez que renderizar novamente current vai receber o valor de cart
      prevCartRef.current = cart; //Atribuindo referência apontando para a variavel cart
    }); /* Para  useEfect rodar toda vez que o cart provider renderizar novamente eu não passo nada no array de dependências */
    /* Como não podemos monitorar uma ref através do array de dependências de um useEfect vamos fazer o seguinte: */
    //Verifica se o valor atual do carrinho é diferente do valor anterior
    const cartPreviousValue = prevCartRef.current ?? cart; 
    /* prevCartRef.current começca como undefined então na primeira passada eu atribuo o valor de cart ao cartPreviousValue, depois, quando cartPreviousValue for diferente de undefined (nas proximas passadas) ele vai receber o valor de prevCartRef.current */
    useEffect(() => {
      /*Se o valor atual do carrinho for diferente do anterior quer dizer que ele atualizou, então devo atualizar/alterar o valor no localstorage caso contrario não faço nada */
      if(cartPreviousValue !== cart) {
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
      }
    }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]; //Criaando uma variável identica a cart;
      /* Esse exemplo está respeitando a imutabilidade do React pois ao utilizar o sprad dessa forma ao declarar a variavel updatedCart: [...cart] 
      o valor contido em cart é replicado para variavel updatedCart, porém sem passar a referência. Ou seja, ao alterar updatedCart não estaremos alterando a variavel cart (caso o valor tivesse sido passado assim: const updatedCart = cart as duas variaveis estariam referenciando o mesmo valor e ao alterar updatedCart a variavel cart também seria alterado e isso iria ferir o principio de imutabilidade do React) */

      //Retorna o produto caso ele exista
      const productExists = updatedCart.find(product => product.id === productId);

      //Buscando produto no stock pelo id
      const stock = await api.get(`/stock/${productId}`);
      //Quantidade do produto dispoível no stock
      const stockAmount = stock.data.amount;

      //Atualizando quantidade do produto
      const currentAmount = productExists ? productExists.amount : 0;
      const amount = currentAmount + 1;

      //Se a quantidade do prod adicionado for maior do q a disponível no stock
      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      //Verificando se o prod existe
      if(productExists) {
        //Atualizar quantidade do produto no carrinho
        productExists.amount = amount;
        /* Essa operação atualiza automaticamente o valor do produto na lista  de updatedCart
        e não interfere na variavel cart pois são referências diferentes */
      } else {
        //Adicionar produto ao carrinho caso não exista
        const product = await api.get(`/products/${productId}`);
        const newProduct = {
          ...product.data,
          amount: 1,
        }
        //Adicionando novo iten a lista copiada:
        updatedCart.push(newProduct);
      }

      //Atualizando itens do carrinho e do localstorage
      setCart(updatedCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {  
    try {
      const updatedCart = [...cart];
      //findIndex - Retorna -1 caso não encontre o elemento
      const productIndex = updatedCart.findIndex(product => product.id === productId);

      if(productIndex >= 0) {
        //Item encontrado no carrinho
        //Removendo produto de acordo com o index
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      //Item não encontrado no carrinho
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);

      if(productExists) {
        productExists.amount = amount;
        setCart(updatedCart);

      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
